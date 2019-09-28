#!/usr/bin/env bash
openssl genrsa 1024 > key.pem && openssl req -new -key key.pem -out csr.pem && openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.crt


