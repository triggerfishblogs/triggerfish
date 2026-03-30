.PHONY: build build-cli install install-cli release test lint fmt check clean docker tidepool-ui tauri

build: tidepool-ui
	deno task compile

build-cli:
	deno task compile

tidepool-ui:
	cd tidepool-ui && npm install && npm run build

tauri:
	@if [ -z "$$PKG_CONFIG_PATH" ] && command -v brew >/dev/null 2>&1; then \
		export PKG_CONFIG_PATH=$$(find $$(brew --prefix)/opt/*/lib/pkgconfig $$(brew --prefix)/opt/*/share/pkgconfig -maxdepth 0 2>/dev/null | paste -sd: -); \
		cd tauri && cargo build --release; \
	else \
		cd tauri && cargo build --release; \
	fi

install: build tauri
	mkdir -p $(HOME)/.local/bin
	cp triggerfish $(HOME)/.local/bin/triggerfish
	@if [ -f tauri/target/release/triggerfish-tidepool ]; then \
		cp tauri/target/release/triggerfish-tidepool $(HOME)/.local/bin/triggerfish-tidepool; \
		echo "Installed triggerfish-tidepool to $(HOME)/.local/bin/"; \
	fi

install-cli: build-cli
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
	cd tauri && cargo clean 2>/dev/null || true

docker:
	docker build -f deploy/docker/Dockerfile -t triggerfish:local .
