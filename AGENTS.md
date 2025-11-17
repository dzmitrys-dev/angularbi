# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands
- `npm start` or `ng serve` (dev server on localhost:4200)
- `npm test` (Karma/Jasmine); single test: `ng test --include=src/**/app.spec.ts`
- `ng lint` (no package.json script; Angular CLI default)
- `ng build` (production to dist/)

## Code Style (configs)
- Prettier: printWidth=100, singleQuote=true, angular HTML parser ([`package.json`](package.json:11))
- EditorConfig: 2-space indent, single quotes TS, no trailing WS (except MD) ([`.editorconfig`](.editorconfig:4))
- TS: strict=true, ES2022 target, strictTemplates=true, experimentalDecorators=true ([`tsconfig.json`](angularbi/tsconfig.json:6))

## Patterns
- Zoneless change detection globally ([`app.config.ts`](angularbi/src/app/app.config.ts:9))
- Tests require provideZonelessChangeDetection() ([`app.spec.ts`](angularbi/src/app/app.spec.ts:9))
- Include project AI rules ([`.claude/CLAUDE.md`](angularbi/.claude/CLAUDE.md), [`.cursor/rules/cursor.mdc`](angularbi/.cursor/rules/cursor.mdc)): standalone default (no `standalone: true`), signals/input/output/computed, OnPush CD, native control flow, no HostBinding/@HostListener/ngClass/ngStyle, reactive forms, inject(), providedIn:'root'

## Gotchas
- Routes empty; add to [`app.routes.ts`](angularbi/src/app/app.routes.ts)
- App title via signal; tests expect "Hello, angularbi" ([`app.spec.ts`](angularbi/src/app/app.spec.ts:23))