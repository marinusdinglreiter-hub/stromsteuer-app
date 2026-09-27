# Vollmachts-Onboarding — Spezifikation

Stand 27.09.2026. Der Portal-Zugang des Kunden ist die Stelle, an der Mandate
verloren gehen, bevor ein Honorar entsteht.

## Was im Zoll-Portal passiert

Fünf Schritte beim Kunden, zwei bei uns.

Kunde:

1. zoll-portal.de, Login über ELSTER: Zertifikatsdatei hochladen, Passwort
   eingeben
2. Unternehmensdaten prüfen und ergänzen
3. Hauptbenutzer festlegen
4. Übersicht → Vollmachten → „Neue Vollmacht einrichten", dabei die digitale
   Bescheidbereitstellung aktivieren
5. „Ich möchte vertreten werden" wählen, Dienstleistung **„Sonstige steuerliche
   Anträge"**, Zugangscode erzeugen

Vertreter:

6. Zugangscode einlösen, dazu die Beteiligten-Nummer des Kunden
7. Kunde bestätigt die Vollmacht

Danach arbeitet die Kanzlei mit einem eigenen Login für alle Mandanten und wählt
den Vollmachtgeber beim Start des Antrags aus.

## Drei Eigenschaften, die das Design bestimmen

Die Vollmacht gilt **pro Dienstleistung**. Wählt der Kunde in Schritt 5 die
falsche, kann die Kanzlei nicht einreichen, und das Portal sagt es ihm nicht. Der
Wortlaut muss in der Anleitung hervorgehoben stehen, und der Umfang wird nach dem
Einlösen einmal geprüft.

Bescheide gehen nach Erteilung **ausschließlich in das Profil des Vertreters**.
Für die Abrechnung günstig, weil uns die Festsetzung zuerst erreicht. Der Kunde
muss es vorher wissen; der Punkt gehört in den Vertragstext und in die
Bestätigungsmail.

Beide Seiten brauchen eine eigene Portal-Registrierung.

## Konstruktionsprinzipien

Es gibt genau ein verifizierbares Signal: den Zugangscode, der ankommt und sich
einlösen lässt. Alles davor ist Selbstauskunft. Der Flow fragt den Kunden nicht
ab, sondern führt ihn auf dieses Ereignis hin und hält dahinter nach.

Datenerfassung und Portal-Zugang laufen als zwei unabhängige Spuren. Der Antrag
geht raus, wenn beide grün sind. Seriell gebaut verliert man Kunden in der
Postlaufzeit des ELSTER-Aktivierungscodes.

Automatisiert wird das Nachhalten, nicht das Helfen. 15 Minuten Telefon mit
Bildschirmfreigabe sind die billigste Conversion-Maßnahme im Trichter.

## Der ELSTER-Zweig

Das Zertifikat ist der eigentliche Engpass, nicht die Vollmacht. Erste Frage im
Flow, drei Antworten, drei Pfade.

**Zertifikatsdatei ist im Haus.** Direkt weiter, Onboarding an einem Vormittag
machbar.

**Liegt beim Steuerberater.** Der häufigste Fall. Hier entscheidet sich die
Conversion, und zwar an einer Textvorlage, nicht an einem Feature. Der Kunde
leitet die Vorlage unten weiter; der Steuerberater führt die Schritte selbst aus
oder bestätigt, dass kein Zertifikat existiert.

**Kein Zertifikat vorhanden.** Registrierung bei ELSTER, Aktivierungscode kommt
per Post, ein bis zwei Wochen. Als Wartezustand modellieren, nicht als Abbruch.

Der Kunde wird nie aufgefordert, Zertifikatsdatei und Passwort per E-Mail
weiterzugeben, auch nicht an uns. Das ist die Zugangsberechtigung des
Unternehmens zu seinen Steuerdaten.

## Zustandsmodell

```
NEU
 └─ elsterStatus?
     ├─ VORHANDEN → PORTAL_OFFEN
     ├─ BEIM_STB  → WARTET_AUF_STB  → PORTAL_OFFEN
     └─ FEHLT     → WARTET_AUF_POST → PORTAL_OFFEN

PORTAL_OFFEN → PORTAL_REGISTRIERT → VOLLMACHT_ERTEILT
             → CODE_EINGELOEST → SCOPE_GEPRUEFT → AKTIV
```

Nebenzustände: `ABGELAUFEN` (Code verfallen, neuer nötig), `SCOPE_FALSCH`
(falsche Dienstleistung, Schritt 5 wiederholen), `VERTAGT_2026` (Frist für das
Verbrauchsjahr nicht mehr erreichbar).

## Datenmodell

Die Entität hängt am Mandanten, nicht am Antrag — der Zugang gilt über Jahre.

```prisma
model PortalZugang {
  id                      String   @id @default(cuid())
  mandant                 Mandant  @relation(fields: [mandantId], references: [id], onDelete: Cascade)
  mandantId               String   @unique
  elsterStatus            ElsterStatus      @default(UNBEKANNT)
  portalKontoStatus       PortalKontoStatus @default(OFFEN)
  vollmachtStatus         VollmachtStatus   @default(OFFEN)
  beteiligtenNummer       String?
  zugangscodeEingeloestAt DateTime?
  scopeGeprueftAt         DateTime?
  scopeGeprueftVon        String?
  bescheidZustellungAktiv Boolean  @default(false)
  eskalationsstufe        Int      @default(0)
  letzteErinnerungAt      DateTime?
  notizen                 String?
}

enum ElsterStatus      { UNBEKANNT VORHANDEN BEIM_STB FEHLT BEANTRAGT }
enum PortalKontoStatus { OFFEN REGISTRIERT }
enum VollmachtStatus   { OFFEN ERTEILT CODE_EINGELOEST AKTIV ABGELAUFEN SCOPE_FALSCH }
```

Jeder Statuswechsel schreibt einen `AuditEvent`. Der Zugangscode wird nach dem
Einlösen nicht gespeichert.

## Die Kundenseite

Erreichbar über den bestehenden Magic-Link `/status/<token>`, kein Login.

Oben zwei Fortschrittsbalken für die beiden Spuren, damit der Kunde sieht, dass
seine Unterlagen längst da sind und nur der Zugang fehlt.

Darunter die fünf Schritte als Checkliste. Jeder Schritt zeigt einen Satz, was zu
tun ist, einen Screenshot des echten Portal-Bildschirms, einen Direktlink an die
richtige Stelle, eine Zeitschätzung und einen Haken.

Die Screenshots sind der Kern dieser Seite. Bei Schritt 5 steht der Wortlaut der
zu wählenden Dienstleistung so, dass man ihn nicht überlesen kann.

Zugangscode und Beteiligten-Nummer gibt der Kunde in ein Formular auf dieser
Seite ein, nicht per E-Mail.

Unter der Checkliste dauerhaft zwei Angebote: Termin buchen und Rückruf
anfordern.

## Verifikation durch die Kanzlei

Nach dem Einlösen prüft die Kanzlei, ob die Vollmacht auf „Sonstige steuerliche
Anträge" lautet und die digitale Bescheidbereitstellung aktiv ist. Erst danach
schaltet die Kundenseite auf fertig. Ohne diesen Schritt fällt eine falsch
gewählte Dienstleistung erst beim Einreichen auf, womöglich kurz vor der Frist.

## Erinnerungen und Eskalation

| Stufe | Zeitpunkt | Maßnahme |
|---|---|---|
| 1 | Tag 2 | Erinnerung per E-Mail mit Link zur Anleitung |
| 2 | Tag 5 | Angebot eines geführten Termins |
| 3 | Tag 10 | Anruf, Frist benannt |
| 4 | Tag 14 | Terminvorschlag mit festen Zeitfenstern |

Tage zählen ab Vertragsunterschrift, nicht ab Registrierung. `WARTET_AUF_POST`
pausiert die Zählung, `WARTET_AUF_STB` nicht.

## Textvorlagen

### An den Steuerberater (der Kunde leitet weiter)

Betreff: Zoll-Portal — Vollmacht für die Stromsteuer-Entlastung

Guten Tag Frau/Herr [Name],

wir beantragen für [Jahr] die Entlastung von der Stromsteuer nach § 9b StromStG.
Der Antrag läuft seit 2025 nur noch über das Zoll-Portal, und die Einreichung
übernimmt [Kanzlei] für uns. Dafür müssen wir dort eine Vollmacht erteilen.

Die Anmeldung im Portal setzt ein ELSTER-Zertifikat unseres Unternehmens voraus.
Haben wir eines, und verwalten Sie es?

Wenn ja, wären das diese Schritte, zusammen etwa zehn Minuten:

1. Login auf zoll-portal.de mit dem ELSTER-Zertifikat
2. Unternehmensdaten prüfen, Hauptbenutzer festlegen
3. Vollmachten, dann „Neue Vollmacht einrichten"
4. Digitale Bescheidbereitstellung aktivieren
5. „Ich möchte vertreten werden", Dienstleistung „Sonstige steuerliche Anträge"
6. Zugangscode erzeugen und mir zusammen mit unserer Beteiligten-Nummer schicken

Falls wir kein Zertifikat haben, sagen Sie mir bitte kurz Bescheid. Dann
beantragen wir eines selbst; das dauert wegen des Aktivierungscodes per Post ein
bis zwei Wochen.

Viele Grüße

### Erinnerung, Tag 2

Betreff: Nur noch der Portal-Zugang fehlt

Guten Tag Frau/Herr [Name],

Ihre Stromrechnungen liegen bei uns, die Berechnung steht: [Betrag] € für
[Jahr]. Was noch fehlt, ist die Vollmacht im Zoll-Portal. Ohne sie darf
[Kanzlei] den Antrag nicht stellen.

Die Anleitung mit Screenshots aus dem Portal: [Link]

Wenn das Zertifikat im Haus ist, sind es etwa 20 Minuten. Wenn irgendwo etwas
klemmt, antworten Sie einfach auf diese Mail.

Viele Grüße

### Erinnerung, Tag 5

Betreff: Sollen wir den Portal-Zugang gemeinsam einrichten?

Guten Tag Frau/Herr [Name],

der Zugang zum Zoll-Portal steht noch aus. Das ist kein Vorwurf — das Portal ist
an zwei Stellen unübersichtlich, und wir kennen beide.

Angebot: 15 Minuten Telefon mit Bildschirmfreigabe, danach ist die Vollmacht
erteilt. Termin wählen: [Link]

Wenn Ihnen das Zertifikat fehlt oder es beim Steuerberater liegt, sagen Sie es
uns. Dafür haben wir ein Anschreiben, das Sie weiterleiten können.

Viele Grüße

### Erinnerung, Tag 10

Betreff: Frist 31. Dezember — Zugang bis [Datum] nötig

Guten Tag Frau/Herr [Name],

der Antrag für das Verbrauchsjahr [Jahr] muss bis zum 31. Dezember [Jahr+1] beim
Hauptzollamt sein. Das ist eine Ausschlussfrist, danach verfällt der Anspruch auf
[Betrag] €.

Damit die Prüfung und die Einreichung durch [Kanzlei] hineinpassen, brauchen wir
Ihre Vollmacht bis zum [Datum]. Fehlt Ihnen das ELSTER-Zertifikat, sollten Sie es
jetzt beantragen; der Aktivierungscode kommt per Post.

Ich rufe Sie morgen an. Falls Sie es vorher erledigen wollen: [Link]

Viele Grüße

### Nach dem Einlösen

Betreff: Vollmacht ist aktiv

Guten Tag Frau/Herr [Name],

wir haben den Zugangscode eingelöst, die Vollmacht ist aktiv und auf die richtige
Dienstleistung ausgestellt. Im Portal müssen Sie nichts weiter tun.

Ein Hinweis dazu: Bescheide des Hauptzollamts gehen ab jetzt in das
Portal-Profil von [Kanzlei], nicht in Ihres. Wir leiten sie Ihnen weiter, sobald
sie eingehen.

Wie es weitergeht: [Kanzlei] reicht den Antrag bis [Datum] ein, danach
entscheidet das Hauptzollamt. Den Stand sehen Sie jederzeit unter [Link].

Viele Grüße

## Stichtage, Beispiel Verbrauchsjahr 2025

Rückwärts gerechnet von der Ausschlussfrist am 31.12.2026.

| Schritt | Bedarf | Spätester Termin |
|---|---|---|
| Einreichung durch die Kanzlei | 2 Wochen Puffer | 15.12.2026 |
| Aufbereitung und Prüfung bei uns | 1 Woche | 08.12.2026 |
| Vollmacht einlösen und bestätigen | einige Tage | 01.12.2026 |
| Registrierung und Vollmacht beim Kunden | 1 Woche | 24.11.2026 |
| ELSTER-Zertifikat beantragen | 2 Wochen | 10.11.2026 |

Kunden mit Zertifikat im Haus können bis etwa 24. November starten, Kunden ohne
Zertifikat bis etwa 10. November. Wer später unterschreibt, wird auf das nächste
Verbrauchsjahr gelenkt, mit dem Hinweis, dass das alte verfallen ist.

Das Vertriebsfenster ist also deutlich kürzer als bis Jahresende. Der Stichtag
gehört als harte Regel in die App.

## Offene Punkte

Das Zoll-Portal nennt Dienstleistungen, bei denen eine gesonderte
Bevollmächtigung genügt und nur der Vertreter ein Portal-Konto braucht. Ob
„Entlastung Energie/Strom für Unternehmen" dazugehört, ist nicht geklärt. Falls
ja, entfällt für den Kunden die eigene Registrierung und dieses Onboarding
schrumpft auf einen Bruchteil. Frage an den Service Desk Zoll,
0800 8007-5452 — die wertvollste offene Frage im Projekt.

Wie lange der Zugangscode gültig ist, ist nicht dokumentiert. Bis das geklärt
ist, behandelt die App ihn als kurzlebig und mahnt das Einlösen am selben Tag an.

Ob die Kanzlei je Mandant etwas gegenzeichnen muss oder das Einlösen genügt, ist
mit ihr zu klären.
