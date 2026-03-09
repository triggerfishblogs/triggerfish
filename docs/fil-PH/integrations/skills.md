# Skills Platform

Ang Skills ang primary extensibility mechanism ng Triggerfish. Ang skill ay
isang folder na naglalaman ng `SKILL.md` file -- instructions at metadata na
nagbibigay sa agent ng bagong capabilities nang hindi kailangang magsulat ng
plugin o bumuo ng custom code.

Ang Skills ang paraan ng agent para matutong gumawa ng bagong bagay: mag-check
ng calendar, mag-prepare ng morning briefings, mag-triage ng GitHub issues,
mag-draft ng weekly summaries. Pwede silang i-install mula sa marketplace,
isulat nang manual, o i-author ng agent mismo.

## Ano ang Skill?

Ang skill ay isang folder na may `SKILL.md` file sa root nito. Naglalaman ang
file ng YAML frontmatter (metadata) at markdown body (instructions para sa
agent). Ang mga optional supporting files -- scripts, templates, configuration
-- ay pwedeng nasa katabi nito.

```
morning-briefing/
  SKILL.md
  briefing.ts        # Optional supporting code
  template.md        # Optional template
```

### Frontmatter Fields

| Field                                         | Required | Description                                                       |
| --------------------------------------------- | :------: | ----------------------------------------------------------------- |
| `name`                                        |    Oo    | Unique skill identifier                                           |
| `description`                                 |    Oo    | Human-readable description ng ginagawa ng skill                   |
| `version`                                     |    Oo    | Semantic version                                                  |
| `category`                                    |   Hindi  | Grouping category (productivity, development, communication, atbp.) |
| `tags`                                        |   Hindi  | Searchable tags para sa discovery                                 |
| `triggers`                                    |   Hindi  | Automatic invocation rules (cron schedules, event patterns)       |
| `metadata.triggerfish.classification_ceiling`  |   Hindi  | Maximum taint level na pwedeng abutin ng skill (default: `PUBLIC`) |
| `metadata.triggerfish.requires_tools`          |   Hindi  | Mga tools na kailangan ng skill (browser, exec, atbp.)           |
| `metadata.triggerfish.network_domains`         |   Hindi  | Mga allowed network endpoints para sa skill                      |

## Mga Uri ng Skill

Sumusuporta ang Triggerfish ng tatlong uri ng skills, na may malinaw na priority
order kapag nagko-conflict ang mga pangalan.

### Bundled Skills

Kasama sa Triggerfish sa `skills/bundled/` directory. Maintained ng project.
Palaging available.

### Managed Skills

Na-install mula sa **The Reef** (ang community skill marketplace). Dina-download
at sino-store sa `~/.triggerfish/skills/`.

```bash
triggerfish skill install google-cal
triggerfish skill install github-triage
```

### Workspace Skills

Ginawa ng user o ina-author ng agent sa
[exec environment](./exec-environment). Sino-store sa workspace ng agent sa
`~/.triggerfish/workspace/<agent-id>/skills/`.

Ang mga workspace skills ang may pinakamataas na priority. Kung gumawa ka ng
skill na may parehong pangalan sa bundled o managed skill, ang iyong version
ang mauuna.

```
Priority:  Workspace  >  Managed  >  Bundled
```

::: tip Ang priority order na ito ay nangangahulugan na palagi mong ma-override
ang bundled o marketplace skill gamit ang sarili mong version. Hindi kailanman
mao-overwrite ng updates ang iyong mga customizations. :::

## Agent Self-Authoring

Isang key differentiator: pwedeng magsulat ng sariling skills ang agent. Kapag
hiniling na gawin ang isang bagay na hindi niya alam, pwedeng gamitin ng agent
ang [exec environment](./exec-environment) para gumawa ng `SKILL.md` at
supporting code, saka i-package ito bilang workspace skill.

::: warning SECURITY Palaging nangangailangan ng owner approval ang
agent-authored skills bago sila maging active. Hindi pwedeng mag-self-approve ng
sariling skills ang agent. Pinipigilan nito ang agent na gumawa ng capabilities
na lumalampas sa iyong oversight. :::

## The Reef <ComingSoon :inline="true" />

Ang The Reef ang community skill marketplace ng Triggerfish -- isang registry
kung saan pwede kang mag-discover, mag-install, mag-publish, at mag-share ng
skills.

### CLI Commands

```bash
# Maghanap ng skills
triggerfish skill search "calendar"

# Mag-install ng skill mula sa The Reef
triggerfish skill install google-cal

# Mag-list ng installed skills
triggerfish skill list

# Mag-update ng lahat ng managed skills
triggerfish skill update --all

# Mag-publish ng skill sa The Reef
triggerfish skill publish

# Mag-remove ng skill
triggerfish skill remove google-cal
```

## Skill Security Summary

- Dine-declare ng skills ang kanilang security requirements upfront
  (classification ceiling, tools, network domains)
- Ang tool access ay gated ng policy -- ang skill na may
  `requires_tools: [browser]` ay hindi gagana kung blocked ng policy ang browser
  access
- Ine-enforce ang network domains -- hindi maka-access ang skill ng mga
  endpoints na hindi niya dineclare
- Nangangailangan ng explicit owner/admin approval ang agent-authored skills
- Lahat ng skill invocations ay dumadaan sa policy hooks at fully audited
