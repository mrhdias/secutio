package main

//
// Author: Henrique Dias
// Last Modification: 2024-02-29 19:26:20
//

import (
	"fmt"
	"net/http"
	"os/exec"
	"path"
	"runtime"
	"strconv"
	"strings"
	"text/template"
	"time"
)

type App struct {
	DefaultEmailTo   EmailAddress
	MaxNumberAttachs int
	MaxAttachsSize   int
	TemplatesDir     string
	CacheDir         string
	PublicDir        string
	ListenPort       int
	Debug            bool
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

func (app *App) getForm(w http.ResponseWriter, r *http.Request) {
	tpl, err := template.ParseFiles(path.Join(app.TemplatesDir, "form.html"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tpl.Execute(w, map[string]string{
		"NameSender":  "",
		"EmailSender": "",
		"NameTo":      app.DefaultEmailTo.Name,
		"EmailTo":     app.DefaultEmailTo.Address,
		"Phone":       "",
		"Subject":     "",
		"Message":     "",
		"Checked":     "",
		"Disabled":    "disabled",
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (app *App) getAttachments(w http.ResponseWriter, r *http.Request) {
	tpl, err := template.ParseFiles(path.Join(app.TemplatesDir, "attachments.html"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	if err := tpl.Execute(w, map[string]string{
		"Header":           "Attachment",
		"MaxNumberAttachs": strconv.Itoa(app.MaxNumberAttachs),
		"MaxAttachsSize":   strconv.Itoa(app.MaxAttachsSize),
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (app *App) sendMail(w http.ResponseWriter, r *http.Request) {

	tpl, err := template.ParseFiles(path.Join(app.TemplatesDir, "alert.html"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// debug
	if app.Debug {
		fmt.Println("name_sender:", r.FormValue("name_sender"))
		fmt.Println("email_sender:", r.FormValue("email_sender"))
		fmt.Println("name_to:", r.FormValue("name_to"))
		fmt.Println("email_to:", r.FormValue("email_to"))
		fmt.Println("subject:", r.FormValue("subject"))
		fmt.Println("message:", r.FormValue("message"))
		fmt.Println("copy_to_me:", r.FormValue("copy_to_me"))
		fmt.Println("your_consent:", r.FormValue("your_consent"))
	}

	// Parse our multipart form, 10 << 20 specifies a maximum
	// upload of 10 MB files.
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		if err := tpl.Execute(w, map[string]string{
			"Type":    "danger",
			"Message": "Error retrieving the attachment!",
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	senderContacts := func() string {
		if r.FormValue("name_sender") == "" {
			r.FormValue("email_to")
		}
		return fmt.Sprintf("%s <%s>",
			r.FormValue("name_sender"),
			r.FormValue("email_to"))
	}()

	if r.FormValue("phone") != "" {
		senderContacts += fmt.Sprintf("\r\nPhone: %s", r.FormValue("phone"))
	}

	toList := []EmailAddress{
		{
			Name:    r.FormValue("name_to"),
			Address: r.FormValue("email_to"),
		},
	}
	if strings.EqualFold(r.FormValue("copy_to_me"), "true") {
		toList = append(toList, EmailAddress{
			Name:    r.FormValue("name_sender"),
			Address: r.FormValue("email_sender"),
		})
	}

	sm := NewSendMail()

	if err := sm.sendMail(
		EmailAddress{
			Name:    app.DefaultEmailTo.Name,
			Address: app.DefaultEmailTo.Address,
		},
		toList,
		r.FormValue("subject"),
		fmt.Sprintf("From: %s\r\nSender: %s\r\n\r\nMessage:\r\n%s",
			"Test Form",
			senderContacts,
			func() string {
				if strings.EqualFold(r.FormValue("your_consent"), "true") {
					return fmt.Sprintf("%s\r\n\r\n%s", r.FormValue("message"),
						"You have read and accepted the privacy policy concerning the treatment of personal information.")
				}
				return r.FormValue("message")
			}()),
		r.MultipartForm.File["attachment"],
	); err != nil {
		if err := tpl.Execute(w, map[string]string{
			"Type":    "danger",
			"Message": "An error happened while sending the message!",
		}); err != nil {
			panic(err)
		}
	}

	if err := tpl.Execute(w, map[string]string{
		"Type":    "success",
		"Message": "The email was successfully sent!",
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func NewApp() App {
	app := new(App)

	app.MaxNumberAttachs = 10
	app.MaxAttachsSize = 1024 * 1024 * 10 // 10 MB
	app.DefaultEmailTo = EmailAddress{
		Name:    "Test Form",
		Address: "test@example.com", // please replace with true email
	}
	app.CacheDir = "cache"
	app.TemplatesDir = "templates"
	app.PublicDir = "public/"
	app.ListenPort = 8080
	app.Debug = true

	return *app
}

func main() {

	app := NewApp()

	mux := http.NewServeMux()
	mux.HandleFunc("/getform", app.getForm)
	mux.HandleFunc("/getattachments", app.getAttachments)
	mux.HandleFunc("/sendmail", app.sendMail)
	mux.Handle("/", http.FileServer(http.Dir(app.PublicDir)))

	go func() {
		<-time.After(100 * time.Millisecond)
		openUrlInBrowser(fmt.Sprintf("%s:%d", "http://localhost", app.ListenPort))
	}()

	server := http.Server{
		Addr:    fmt.Sprintf(":%d", app.ListenPort),
		Handler: mux,
	}

	fmt.Printf("Server listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
