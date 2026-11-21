# FinTech News Design Studio

Der Preiskatalog zeigt unter **Produkte** vier auswählbare Musterartikel. Das Angebot richtet sich an FinTech-Teams und Redaktionen. Der Lieferumfang umfasst eine Artikelvorlage, eine eigene Infografik, Alt-Text und einen Herkunftsnachweis. Das Anfrageformular des E-Mail-Clients übernimmt die ausgewählte Variante. Preis und Nutzungsumfang werden individuell angeboten.

| Gestaltung | Informationsgrafik | Einsatz |
| --- | --- | --- |
| Titelbild | Netzwerkknoten | Eine Leitmeldung mit zentralem visuellen Motiv |
| Kurzbriefing | Statusübersicht | Auswirkungen und betroffene Bereiche zuerst |
| Zeitachse | Reihenfolge | Termine, Rollouts und offene Meilensteine |
| Vergleich | Gegenüberstellung | Unterschiede zwischen zwei Produkten oder Bedingungen |

## Entwurf und persönliche Bildfreigabe

1. Eine offizielle Primärquelle und den eigenen Artikeltext prüfen. Den zulässig erfassten Quellsnapshot, Beobachtungszeitpunkt, die passende Grafikrezeptur und das Layout an den Offline-Entwurf geben.
2. `node --import tsx scripts/media/home-editorial-draft.mts request.json source-snapshot /privater/pfad/neuer-entwurf` erzeugt `article.txt`, `graphic.png` und `manifest.json`. Der Zielordner darf noch nicht existieren. Der private Entwurf enthält echte Engine- und Asset-Identitäten. Die Renderer-Rezeptur verwendet drei redaktionelle Panels mit sourceLabel und Alt-Text. Die Layoutauswahl bestimmt die Artikelanordnung.
3. Der Owner prüft persönlich die PNG-Datei, Vorschau, Art und Herkunft der Gestaltung, die Hashes von Quelle, Grafik und Inhalt, die angegebenen Vorlagen-/Schriftressourcen und die KI-Kennzeichnung. In der separaten, ownerkontrollierten Freigabe dokumentiert er Kanal, Lizenz, Entscheidung, Zeitpunkt und Referenz auf die nachprüfbare Autorisierung. Ein Entwurfsmanifest ist kein Freigabenachweis. Nur bestätigte `OriginalGraphicOwnerGrant`-Einträge werden manuell in `homeGraphicOwnerGrants.ts` übernommen. Widerruf mittels `REVOKED`. Keine personenbezogenen Rohbelege in Git ablegen.
4. Unabhängig vom Grafik-Grant müssen die drei Homepage-Redaktionseinträge den exakten Artikelsnapshot abnehmen. Für ein PNG verwendet der Grafik-Eintrag `FIRST_PARTY_RENDERED_GRAPHIC` und verweist mit `graphicGrantId` auf die bestätigte persönliche Freigabe. Quellen-/Textrechte und die individuelle Publikationsfreigabe bleiben getrennt.
5. Nur im autorisierten Editionspfad die endgültigen PNG-Bytes in `public/editorial/news/<sha256>.png` übernehmen und das bereits geprüfte Artikelmodell binden. Der Build prüft Grant, Website-Kanal, Artikeldigest, PNG-Abmessungen, Dateidigest und die öffentliche Ordnerbelegung. Der Browser zeigt nur erfolgreich rückgeprüfte PNG-Bytes und verwendet andernfalls den Alt-Text. Bestehende Artikel mit strukturierten Grafiken behalten ihre Darstellung.

Für eine Grafik, deren unbearbeitete Quelle sich geändert hat, den Quellenvergleich vor der Neufreigabe dokumentieren. Die private Belegsammlung und eine etwaige Kundenlizenz gelten getrennt von einer öffentlichen Artikelpublikation. Der Produktkatalog enthält grafische Muster aus HTML und CSS. Die realen News-Entwürfe werden separat geprüft und gespeichert.
