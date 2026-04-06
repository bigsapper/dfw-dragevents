.DEFAULT_GOAL := help

.PHONY: build sync-data test test-watch coverage start deploy deploy-dry-run help

PYTHON ?= python3
NPM ?= npm

AWS_DIR := aws
SITE_DIR := ../site
SITE_REQUIRED_FILES := \
	$(SITE_DIR)/index.html \
	$(SITE_DIR)/404.html \
	$(SITE_DIR)/events.html \
	$(SITE_DIR)/event.html \
	$(SITE_DIR)/about.html \
	$(SITE_DIR)/about-technical.html \
	$(SITE_DIR)/assets/js/app.js \
	$(SITE_DIR)/assets/js/filters.js \
	$(SITE_DIR)/assets/js/year.js \
	$(SITE_DIR)/assets/css/custom.css \
	$(SITE_DIR)/data/events.json \
	$(SITE_DIR)/data/tracks-filter.json

build:
	@$(MAKE) sync-data
	@echo "Running lightweight site validation..."
	@for file in $(SITE_REQUIRED_FILES); do \
		if [ ! -f "$$file" ]; then \
			echo "Missing required site file: $$file"; \
			exit 1; \
		fi; \
	done
	@echo "Site validation complete"

sync-data:
	@echo "Syncing site data from drag-events-aggregator..."
	@cd $(SITE_DIR) && $(NPM) run sync:data

test:
	@echo "Running frontend tests..."
	@cd $(SITE_DIR) && $(NPM) test

test-watch:
	@echo "Running frontend tests in watch mode..."
	@cd $(SITE_DIR) && $(NPM) run test:watch

coverage:
	@echo "Running frontend coverage..."
	@cd $(SITE_DIR) && $(NPM) run test:coverage

start:
	@echo "Starting local site server..."
	@cd $(SITE_DIR) && $(NPM) start

deploy:
	@echo "Deploying site to AWS..."
	@cd $(AWS_DIR) && $(PYTHON) deploy.py --skip-bucket-creation

deploy-dry-run:
	@echo "Running deployment dry run..."
	@cd $(AWS_DIR) && $(PYTHON) deploy.py --dry-run

help:
	@echo "Available targets:"
	@echo "  make build     - Validate required site files"
	@echo "  make test      - Run frontend tests"
	@echo "  make test-watch - Run frontend tests in watch mode"
	@echo "  make coverage  - Run frontend coverage"
	@echo "  make start     - Start the local site server"
	@echo "  make deploy    - Deploy the site to AWS"
	@echo "  make deploy-dry-run - Preview deployment actions without changing AWS"
