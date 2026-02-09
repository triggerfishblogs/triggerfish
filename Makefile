.PHONY: build install release test lint fmt check

build:
	deno task compile

install: build
	cp triggerfish /usr/local/bin/triggerfish

release:
	deno compile --allow-all --target x86_64-unknown-linux-gnu --output=dist/triggerfish-linux-x64 src/cli/main.ts
	deno compile --allow-all --target aarch64-unknown-linux-gnu --output=dist/triggerfish-linux-arm64 src/cli/main.ts
	deno compile --allow-all --target x86_64-apple-darwin --output=dist/triggerfish-macos-x64 src/cli/main.ts
	deno compile --allow-all --target aarch64-apple-darwin --output=dist/triggerfish-macos-arm64 src/cli/main.ts
	deno compile --allow-all --target x86_64-pc-windows-msvc --output=dist/triggerfish-windows-x64.exe src/cli/main.ts

test:
	deno task test

lint:
	deno task lint

fmt:
	deno task fmt

check:
	deno task check
