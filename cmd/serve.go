package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	// Serve files from the current directory
	fs := http.FileServer(http.Dir(cwd))
	http.Handle("/", fs)

	port := "3001"
	fmt.Printf("Starting local server at http://localhost:%s\n", port)
	fmt.Printf("Serving files from: %s\n", cwd)
	fmt.Println("Press Ctrl+C to stop")

	err = http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal(err)
	}
}
