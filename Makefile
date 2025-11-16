.PHONY: help build up down logs clean restart shell-server shell-client

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build all Docker containers
	docker-compose build

up: ## Start all services
	docker-compose up -d
	@echo ""
	@echo "🎮 Hidden Marks is starting..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:5000"
	@echo ""
	@echo "Run 'make logs' to view logs"

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

logs-server: ## View server logs only
	docker-compose logs -f server

logs-client: ## View client logs only
	docker-compose logs -f client

logs-db: ## View database logs only
	docker-compose logs -f db

restart: ## Restart all services
	docker-compose restart

clean: ## Remove all containers, volumes, and images
	docker-compose down -v
	docker-compose rm -f
	docker system prune -f

shell-server: ## Open shell in server container
	docker-compose exec server sh

shell-client: ## Open shell in client container
	docker-compose exec client sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec db psql -U hiddenmarks -d hiddenmarks

dev: up logs ## Start services and follow logs

status: ## Show status of all services
	docker-compose ps
