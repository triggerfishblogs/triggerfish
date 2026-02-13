.PHONY: build install release test lint fmt check clean docker

build:
	deno task compile

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
