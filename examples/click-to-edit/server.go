package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Contact struct {
	Id        string `json:"id"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	Email     string `json:"email"`
}

var contacts = []Contact{
	{
		Id:        "1",
		FirstName: "Lorem",
		LastName:  "Ipsum",
		Email:     "lorem.ipsum@example.com",
	},
	{
		Id:        "2",
		FirstName: "Mauris",
		LastName:  "Quis",
		Email:     "mauris.quis@example.com",
	},
	{
		Id:        "3",
		FirstName: "Donec Purus",
		LastName:  "Purus",
		Email:     "donec.purus@example.com",
	},
}

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

func contactManager(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodGet {

		parts := strings.Split(r.RequestURI[1:], "/")
		id, _ := strconv.Atoi(parts[1])

		jsonResp, err := json.Marshal(contacts[id-1])
		if err != nil {
			log.Fatalf("Err: %v\r\n", err)
		}

		w.Write([]byte(jsonResp))

		return
	}

	if r.Method == http.MethodPut {
		parts := strings.Split(r.RequestURI[1:], "/")
		id, _ := strconv.Atoi(parts[1])

		// Remove the comment for debugging purposes only.
		// If not commented, the body below is empty since it has already been processed.
		//
		// respContentBytes, _ := io.ReadAll(r.Body)
		// fmt.Println("Response Body:", string(respContentBytes))

		contactToSave := Contact{}

		if err := json.NewDecoder(r.Body).Decode(&contactToSave); err != nil {
			http.Error(w, fmt.Sprintf(`{"message": "%s"}`, err.Error()),
				http.StatusBadRequest)
			return
		}

		contacts[id-1] = contactToSave

		jsonResp, err := json.Marshal(contacts[id-1])
		if err != nil {
			log.Fatalf("Err: %v\r\n", err)
		}

		w.Write([]byte(jsonResp))

		return
	}

	http.Error(w, fmt.Sprintf(`{"message": "Method %s Not Allowed"}`, r.Method),
		http.StatusMethodNotAllowed)
}

func main() {

	mux := http.NewServeMux()
	mux.HandleFunc("/contact/", contactManager)
	mux.Handle("/", http.FileServer(http.Dir("public/")))

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
