.PHONY: help install dev build test lint format clean docker-up docker-down deploy

help:
	@echo "WokiBrain - Make Commands"
	@echo ""
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Run development server"
	@echo "  make build       - Build production bundle"
	@echo "  make test        - Run tests with coverage"
	@echo "  make lint        - Run linter"
	@echo "  make format      - Format code"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make docker-up   - Start Docker services"
	@echo "  make docker-down - Stop Docker services"
	@echo "  make deploy      - Deploy to AWS"

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

test:
	npm run test:coverage

lint:
	npm run lint

format:
	npm run format

clean:
	rm -rf dist coverage node_modules

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

deploy:
	cd terraform && terraform apply -auto-approve



