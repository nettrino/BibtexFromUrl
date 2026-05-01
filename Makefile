NAME    := bibtex-from-url
VERSION := $(shell python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
ZIP     := $(NAME)-$(VERSION).zip

# Files shipped in the extension
DIST_FILES := manifest.json core.js background.js content.js ai.js options.js offscreen.js \
              options.html offscreen.html images/ LICENSE

.PHONY: package clean check test ci bump-patch bump-minor bump-major version

# — Packaging ——————————————————————————————————————————————

package: $(ZIP)

$(ZIP): $(DIST_FILES)
	@rm -f $@
	zip -r $@ $(DIST_FILES)
	@echo "Packaged $(ZIP)"

clean:
	rm -f $(NAME)-*.zip

# — Version bumps —————————————————————————————————————————

# Usage: make bump-patch  (2.1.0 → 2.1.1)
#        make bump-minor  (2.1.0 → 2.2.0)
#        make bump-major  (2.1.0 → 3.0.0)

bump-patch:
	@python3 -c "\
	import json, pathlib; \
	p = pathlib.Path('manifest.json'); \
	m = json.loads(p.read_text()); \
	parts = list(map(int, m['version'].split('.'))); \
	parts[2] += 1; \
	m['version'] = '.'.join(map(str, parts)); \
	p.write_text(json.dumps(m, indent=2) + '\n'); \
	print('Version:', m['version'])"

bump-minor:
	@python3 -c "\
	import json, pathlib; \
	p = pathlib.Path('manifest.json'); \
	m = json.loads(p.read_text()); \
	parts = list(map(int, m['version'].split('.'))); \
	parts[1] += 1; parts[2] = 0; \
	m['version'] = '.'.join(map(str, parts)); \
	p.write_text(json.dumps(m, indent=2) + '\n'); \
	print('Version:', m['version'])"

bump-major:
	@python3 -c "\
	import json, pathlib; \
	p = pathlib.Path('manifest.json'); \
	m = json.loads(p.read_text()); \
	parts = list(map(int, m['version'].split('.'))); \
	parts[0] += 1; parts[1] = 0; parts[2] = 0; \
	m['version'] = '.'.join(map(str, parts)); \
	p.write_text(json.dumps(m, indent=2) + '\n'); \
	print('Version:', m['version'])"

version:
	@echo $(VERSION)

# — Type checking ——————————————————————————————————————————

check:
	npx tsc --noEmit --project jsconfig.json

test:
	node --test test/unit

ci: test check package
