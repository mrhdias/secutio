package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type Contact struct {
	Id     string `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Status string `json:"status"`
}

var contacts = []Contact{
	{
		Id:     "1",
		Name:   "Lorem Ipsum",
		Email:  "lorem.ipsum@example.com",
		Status: "Active",
	},
	{
		Id:     "2",
		Name:   "Mauris Quis",
		Email:  "mauris.quis@example.com",
		Status: "Active",
	},
	{
		Id:     "3",
		Name:   "Donec Purus",
		Email:  "donec.purus@example.com",
		Status: "Active",
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

func transformationHeader(transformations map[string]string) string {
	return strings.Join(func() []string {
		list := []string{}
		for k, v := range transformations {
			list = append(list, fmt.Sprintf("%s:%s", k, v))
		}
		return list
	}(), ";")
}

func switchContactStatus(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPut {
		http.Error(w, fmt.Sprintf(`{"message": "Method %s Not Allowed"}`, r.Method),
			http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Automata-Transformation",
		transformationHeader(map[string]string{
			"target":   "#contacts-list",
			"template": "@contacts-list",
		}))

	content := struct {
		SwitchStatus string   `json:"switch-status"`
		Id           []string `json:"id"`
	}{}

	if err := json.NewDecoder(r.Body).Decode(&content); err != nil {
		http.Error(w, fmt.Sprintf(`{"message": "%s"}`, err.Error()),
			http.StatusBadRequest)
		return
	}

	for _, id := range content.Id {
		for i := range contacts {
			if contacts[i].Id == id {
				contacts[i].Status = func() string {
					if strings.EqualFold(content.SwitchStatus, "deactivate") {
						return "Inactive"
					}
					return "Active"
				}()
			}
		}
	}

	jsonResp, err := json.Marshal(contacts)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"message": "%s"}`, err.Error()),
			http.StatusInternalServerError)
		return
	}

	w.Write([]byte(jsonResp))
}

func listContact(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, fmt.Sprintf(`{"message": "Method %s Not Allowed"}`, r.Method),
			http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Automata-Transformation",
		transformationHeader(map[string]string{
			"target":   "#contacts-list",
			"template": "#contacts-list-tpl",
			"swap":     "innerHTML",
		}))

	jsonResp, err := json.Marshal(contacts)
	if err != nil {
		log.Fatalf("Err: %v\r\n", err)
	}

	w.Write([]byte(jsonResp))
}

func main() {

	mux := http.NewServeMux()
	mux.HandleFunc("/statuscontact", switchContactStatus)
	mux.HandleFunc("/listcontacts", listContact)
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
