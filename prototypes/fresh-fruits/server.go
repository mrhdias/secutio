package main

import (
	"fmt"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

func openUrlInBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default: // "linux", "freebsd", "openbsd", "netbsd"
		cmd = "xdg-open"
	}
	args = append(args, url)

	return exec.Command(cmd, args...).Start()
}

func getFruits(w http.ResponseWriter, r *http.Request) {

    w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, "<strong>%s</strong><ul>%s</ul><button data-tasks=\"empty-bag\" class=\"fruits-button\">Empty Bag</button>",
		"Bag contents:",
		strings.Join(func() []string {
			list := []string{}
			for _, fruit := range []string{
				"Orange",
				"Apples",
				"Pears",
				"Pineapple",
			} {
				list = append(list, fmt.Sprintf("<li>%s</li>", fruit))
			}
			return list
		}(), "\r\n"))
}

func emptyBag(w http.ResponseWriter, r *http.Request) {

    w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, "<button data-tasks=\"get-fruits\" class=\"fruits-button\">Get Fresh Fruits</button>")
}

func main() {

	mux := http.NewServeMux()
	mux.HandleFunc("/getfruits", getFruits)
	mux.HandleFunc("/emptybag", emptyBag)
	mux.Handle("/", http.FileServer(http.Dir("public/")))

	// go openUrlInBrowser("http://localhost:8080")
	go func() {
		<-time.After(100 * time.Millisecond)
		openUrlInBrowser("http://localhost:8080")
	}()

	server := http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	fmt.Printf("Server listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
