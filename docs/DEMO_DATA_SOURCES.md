# Demo Data Sources

## Source-based community facts

The fixture in [`prisma/fixtures/roblox-community.ts`](../prisma/fixtures/roblox-community.ts)
was checked on **2026-11-03**. It records 178 source-based Units, including
officially linked groups and distinct formations named in public descriptions.
It also records Roblox community/group names, IDs,
public links, paraphrased descriptions, available group icons, source URLs, and
the public owner profiles selected for the demo. Group and profile metadata is
frozen in the fixture; resetting the database does not call Roblox.

The primary community's public Affiliates page rendered these nine entries
under its **Allies** heading:

| Group | Roblox group ID |
|---|---:|
| Preußischе Armee | 35965347 |
| Devlet-i Âliye-i Osmâniyye | 32950259 |
| Andouran Empire | 5531725 |
| Exército de Portugаl | 34011906 |
| British Army | 4000196 |
| Kаisеrtum Österreich | 16702357 |
| Impеratorskaya Armiya | 7528791 |
| Ejército dé Eѕpаñа | 11639829 |
| United States Аrmу | 5826061 |

The public page did not render an Enemies heading. The fixture therefore does
not claim enemy status or infer additional political or military relationships.
Publicly linked subordinate groups and formations named in public group
descriptions are represented where their source pages support them, including
additional corps, brigades, regiments, and listed formations without their own
public group. Repeated formation names are represented once rather than given
invented identities. Unrelated administrative, honorary, and commercial
affiliates are excluded; flattened structures are not expanded into invented
real-world hierarchies. Formation records without a separate public group use a
null group ID/link and point to the source group page.

Ten selected public profiles are cached as Roblox Players:

| Username | Roblox user ID | Source group ID(s) |
|---|---:|---|
| NapoleonicWar_s | 4213669967 | 12425385 |
| Lazorem | 121603325 | 35965347 |
| Biographers | 31106766 | 16702357 |
| Rulecy | 19634570 | 34011906, 4000196 |
| Germaticus | 68101532 | 7528791 |
| SultanNevalik | 2442802243 | 32950259 |
| alertcoderf | 7764425 | 5531725 |
| HussBailen | 33537352 | 11639829 |
| BousSherman | 82287034 | 5826061 |
| StevoboWinter | 123754417 | 32374377 |

Group information was checked against public Roblox community/group pages and
the group-details API. Usernames and headshot URLs were verified through the
repository's existing Roblox identity lookup service. Group icons use official
Roblox group-thumbnail URLs. Displayed names preserve the public spelling,
including Unicode characters; descriptions are paraphrased.

## Synthetic demo activity

Only the facts above are represented as source-based. The following records are
fictional examples for testing and demonstration; they do not assert that a real
Roblox user played an Event, joined a Unit roster, submitted an Audit, or earned
a statistic:

- 120 synthetic Players and 12 synthetic mercenary Players;
- three roster-only synthetic Players for every source-based Unit and the
  preserved RootUnit;
- Unit membership history, Event participation, attendance, and battle groups;
- 10 Events, Event results, and battlefield structures;
- FINAL and DRAFT Audits, player results, and derived statistics.

The ten source-based Roblox Player profiles are deliberately excluded from
synthetic memberships, Event results, Audit roles, and command groups. The
additional roster-only synthetic Players are excluded from Event participation
and results, preserving the existing Event fixture. Every seeded Event
description also labels its activity as synthetic. Event types use the existing
`Internal`, `External`, `Mixed`, and `Grand Battle` suggestions.

The fixture retains stable internal Unit route IDs for compatibility. Those
IDs are implementation identifiers, not claims about the Roblox organization.
The preserved RootUnit is application infrastructure and is not one of the
source-based Roblox groups.
