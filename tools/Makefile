.PHONY: build test coverage deploy help

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
	$(SITE_DIR)/data/tracks.json

build:
	@echo "Running lightweight site validation..."
	@for file in $(SITE_REQUIRED_FILES); do \
		if [ ! -f "$$file" ]; then \
			echo "Missing required site file: $$file"; \
			exit 1; \
		fi; \
	done
	@echo "Site validation complete"

test:
	@echo "Running frontend tests..."
	@cd $(SITE_DIR) && $(NPM) test

coverage:
	@echo "Running frontend coverage..."
	@cd $(SITE_DIR) && $(NPM) run test:coverage

deploy:
	@echo "Deploying site to AWS..."
	@cd $(AWS_DIR) && $(PYTHON) deploy.py --skip-bucket-creation

help:
	@echo "Available targets:"
	@echo "  make build     - Validate required site files"
	@echo "  make test      - Run frontend tests"
	@echo "  make coverage  - Run frontend coverage"
	@echo "  make deploy    - Deploy the site to AWS"
