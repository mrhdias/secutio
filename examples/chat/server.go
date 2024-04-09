//
// Last Modification: 2024-04-09 18:46:58
//

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"golang.org/x/net/websocket"
)

type User struct {
	Login string `json:"login"`
	Data  string `json:"data"`
}

type Connection struct {
	Ws             *websocket.Conn
	TimeInactivity *time.Time
}

type App struct {
	Connections map[string]*Connection
	Timeout     int
	PublicDir   string
	ListenPort  int
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

func (app *App) checkInactivity() {
	for {
		usersLogout := []string{}
		for user := range app.Connections {
			difference := time.Until(*app.Connections[user].TimeInactivity)
			if math.Abs(difference.Minutes()) > float64(app.Timeout) {
				log.Printf("User Time Inactivity: %s (%.f)\n",
					user, math.Abs(difference.Minutes()))
				delete(app.Connections, user)
				usersLogout = append(usersLogout, user)
				log.Printf("%s: Left the room\n", user)
			}
		}

		for _, userLogout := range usersLogout {
			userData := User{
				Login: userLogout,
				Data:  "Left the room",
			}

			for user, connection := range app.Connections {
				if err := websocket.JSON.Send(connection.Ws, userData); err != nil {
					log.Printf("Can't send data to %s\n", user)
				}
			}
		}

		time.Sleep(time.Second * 5)
	}
}

func (app *App) wsHandler(ws *websocket.Conn) {

	go app.checkInactivity()

	for {

		var userData User
		if err := websocket.JSON.Receive(ws, &userData); err != nil {
			log.Println("Can't receive")
			return
		}

		log.Printf("Received: %s: %s\n", ws.RemoteAddr(), userData.Login)

		if _, ok := app.Connections[userData.Login]; !ok {
			log.Printf("user %s don't exist\n", userData.Login)
			continue
		}
		if app.Connections[userData.Login].Ws == nil {
			app.Connections[userData.Login].Ws = ws
		}

		now := time.Now()
		app.Connections[userData.Login].TimeInactivity = &now

		for login, connection := range app.Connections {
			if err := websocket.JSON.Send(connection.Ws, userData); err != nil {
				log.Printf("Can't send data to %s, so it is removed\n", login)
				delete(app.Connections, login)
			}
		}
	}
}

func (app *App) logout(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed",
			http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Path
	parts := strings.Split(path[1:], "/")
	if len(parts) != 2 {
		http.Error(w, "Bad Request",
			http.StatusBadRequest)
		return
	}

	user := parts[1]

	if _, ok := app.Connections[user]; !ok {
		http.Error(w, "Not Found",
			http.StatusNotFound)
		return
	}

	now := time.Now().Add(time.Minute * time.Duration(app.Timeout) * -1)

	app.Connections[user].TimeInactivity = &now

	w.WriteHeader(http.StatusOK)
}

func (app *App) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed",
			http.StatusMethodNotAllowed)
		return
	}

	var data map[string]string

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Bat Request",
			http.StatusBadRequest)
		return
	}

	if func() bool {
		if _, ok := app.Connections[data["user"]]; ok {
			return true
		}

		connection := Connection{}
		app.Connections[data["user"]] = &connection

		now := time.Now()
		app.Connections[data["user"]].TimeInactivity = &now

		log.Printf("%s: Entered the room\n", data["user"])

		return false
	}() {
		http.Error(w, "Found",
			http.StatusFound)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func NewApp() App {
	app := new(App)

	app.Connections = map[string]*Connection{}
	app.PublicDir = "./public"
	app.ListenPort = 8080
	app.Timeout = 15

	return *app
}

func main() {

	app := NewApp()

	mux := http.NewServeMux()

	mux.Handle("/echo", websocket.Handler(app.wsHandler))
	mux.HandleFunc("/login", app.login)
	mux.HandleFunc("/logout/", app.logout)
	mux.Handle("/", http.FileServer(http.Dir(app.PublicDir)))

	go func() {
		<-time.After(100 * time.Millisecond)
		openUrlInBrowser(fmt.Sprintf("%s:%d",
			"http://localhost",
			app.ListenPort))
	}()

	server := http.Server{
		Addr:    fmt.Sprintf(":%d", app.ListenPort),
		Handler: mux,
	}

	fmt.Printf("Server listening on %s\r\n", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
