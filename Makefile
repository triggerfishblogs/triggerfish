.PHONY: build install release test lint fmt check clean docker tidepool-ui

build: tidepool-ui
	deno task compile

tidepool-ui:
	cd tidepool-ui && npm install && npm run build

install: build
	mkdir -p $(HOME)/.local/bin
	cp triggerfish $(HOME)/.local/bin/triggerfish

release:
	./deploy/scripts/build.sh

test:
	deno task test

lint:
	deno task lint

fmt:
	deno task fmt

check:
	deno task check

clean:
	rm -rf dist/
	rm -f triggerfish

docker:
	docker build -f deploy/docker/Dockerfile -t triggerfish:local .
