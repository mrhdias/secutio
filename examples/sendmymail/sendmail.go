package main

//
// Author: Henrique Dias
// Last Modification: 2024-02-29 18:54:33
//
// References:
// https://developers.google.com/gmail/api/quickstart/go
//

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/mail"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

type EmailAddress struct {
	Name    string
	Address string
}

type SendMail struct {
	GmailHttpClient *http.Client
}

func chunkSplit(body string, limit int) string {
	var charSlice []rune

	// push characters to slice
	for _, char := range body {
		charSlice = append(charSlice, char)
	}

	var result = ""

	for len(charSlice) >= 1 {
		// convert slice/array back to string
		// but insert end at specified limit
		result = result + string(charSlice[:limit])

		// discard the elements that were copied over to result
		charSlice = charSlice[limit:]

		// change the limit
		// to cater for the last few words in
		if len(charSlice) < limit {
			limit = len(charSlice)
		}
	}
	return result
}

func randStr(strSize int, randType string) string {

	var dictionary string

	if randType == "alphanum" {
		dictionary = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	}

	var strBytes = make([]byte, strSize)
	_, _ = rand.Read(strBytes)
	for k, v := range strBytes {
		strBytes[k] = dictionary[v%byte(len(dictionary))]
	}
	return string(strBytes)
}

func encodeRFC2047(s string) string {
	// use mail's rfc2047 to encode any string
	addr := mail.Address{
		Name:    s,
		Address: "",
	}
	return strings.Trim(addr.String(), " <@>")
}

func addHeaders(headers [][2]string) string {

	var msg string
	for _, header := range headers {
		msg += fmt.Sprintf("%s: %s\r\n", header[0], header[1])
	}

	return msg
}

// Retrieves a token from a local file.
func tokenFromFile(file string) (*oauth2.Token, error) {
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	token := &oauth2.Token{}
	err = json.NewDecoder(f).Decode(token)

	return token, err
}

// Saves a token to a file path.
func saveToken(path string, token *oauth2.Token) error {
	log.Printf("Saving credential file to: %s\n", path)

	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("unable to cache oauth token: %v", err)
	}
	defer f.Close()
	json.NewEncoder(f).Encode(token)

	return nil
}

// Request a token from the web, then returns the retrieved token.
func getTokenFromWeb(config *oauth2.Config) (*oauth2.Token, error) {
	authURL := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	fmt.Printf("%s:\n%v\n%s\n%s\n%s\n",
		"Copy and paste the following link into your browser:",
		authURL,
		"Look for the code when you get the URL:",
		"http://localhost/?state=state-token&code=<THIS-CODE>&scope=https://www.googleapis.com/auth/gmail.send",
		"Type the authorization code in this terminal:")

	var authCode string
	if _, err := fmt.Scan(&authCode); err != nil {
		return nil, fmt.Errorf("unable to read authorization code: %v", err)
	}

	token, err := config.Exchange(context.TODO(), authCode)
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve token from web: %v", err)
	}
	return token, nil
}

func composeMessage(
	fromField EmailAddress,
	toField []EmailAddress,
	subject, content string,
	attachments []*multipart.FileHeader) (*gmail.Message, error) {

	from := mail.Address{
		Name:    fromField.Name,
		Address: fromField.Address,
	}

	toAdresses := []string{}
	for _, toAddress := range toField {
		to := mail.Address{
			Name:    toAddress.Name,
			Address: toAddress.Address,
		}
		toAdresses = append(toAdresses, to.String())
	}

	boundary := randStr(32, "alphanum")

	messageBody := addHeaders([][2]string{
		{"From", from.String()},
		{"To", strings.Join(toAdresses, ", ")},
		{"Subject", encodeRFC2047(subject)},
		{"MIME-Version", "1.0"},
		{"Content-Type", fmt.Sprintf("multipart/mixed; boundary=\"%s\"", boundary)},
	})

	messageBody += fmt.Sprintf("\r\n--%s\r\n", boundary)

	messageBody += addHeaders([][2]string{
		{"MIME-Version", "1.0"},
		{"Content-Transfer-Encoding", "7bit"},
		{"Content-Type", "text/plain; charset=\"UTF-8\""},
	})

	messageBody += fmt.Sprintf("\r\n%s\r\n\r\n--%s", content, boundary)

	for _, fh := range attachments {
		fmt.Printf("Uploaded File: %+v\n", fh.Filename)
		fmt.Printf("File Size: %+v\n", fh.Size)
		fmt.Printf("MIME Header: %+v\n", fh.Header)

		messageBody += "\r\n"

		file, err := fh.Open()
		if err != nil {
			return nil, err
		}

		bytesReaded, err := io.ReadAll(file)
		if err != nil {
			return nil, err
		}

		fileMimeType := http.DetectContentType(bytesReaded)
		fileData := base64.StdEncoding.EncodeToString(bytesReaded)

		messageBody += addHeaders([][2]string{
			{"MIME-Version", "1.0"},
			{"Content-Type", fmt.Sprintf("%s; name=\"%s\"", fileMimeType, fh.Filename)},
			{"Content-Transfer-Encoding", "base64"},
			{"Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fh.Filename)},
		})

		messageBody += fmt.Sprintf("\r\n%s\r\n\r\n--%s", chunkSplit(fileData, 76), boundary)

		file.Close()
	}

	messageBody += "--"

	// fmt.Println(messageBody)

	return &gmail.Message{
		Raw: base64.RawURLEncoding.EncodeToString([]byte(messageBody)),
	}, nil
}

func (sm SendMail) sendMail(
	from EmailAddress,
	to []EmailAddress,
	subject, content string,
	attachments []*multipart.FileHeader) error {

	ctx := context.Background()
	srv, err := gmail.NewService(
		ctx,
		option.WithHTTPClient(sm.GmailHttpClient),
		option.WithScopes("https://www.googleapis.com/auth/gmail.send"),
	)
	if err != nil {
		return fmt.Errorf("unable to retrieve gmail client: %v", err)
	}

	// Create message

	gMessage, err := composeMessage(from, to, subject, content, attachments)
	if err != nil {
		panic(err)
	}

	if _, err := srv.Users.Messages.Send("me", gMessage).Do(); err != nil {
		return fmt.Errorf("could not send mail: %v", err)
	}

	return nil
}

func initGMailClient(cacheDir string) (*http.Client, error) {

	content, err := os.ReadFile("credentials.json")
	if err != nil {
		return nil, fmt.Errorf("unable to read credentials file: %v", err)
	}

	config, err := google.ConfigFromJSON(content, gmail.GmailSendScope)
	if err != nil {
		return nil, fmt.Errorf("unable to parse credentials file config: %v", err)
	}

	tokenFilePath := filepath.Join(cacheDir, "token.json")
	token, err := tokenFromFile(tokenFilePath)
	if err != nil {
		token, err = getTokenFromWeb(config)
		if err != nil {
			return nil, err
		}

		if err := saveToken(tokenFilePath, token); err != nil {
			return nil, err
		}
	}
	// fmt.Println("Token:", token)

	return config.Client(context.Background(), token), nil
}

func NewSendMail() SendMail {
	sendmail := new(SendMail)
	client, err := initGMailClient("cache")
	if err != nil {
		log.Fatalf("%v\r\n", err)
	}
	sendmail.GmailHttpClient = client
	return *sendmail
}
