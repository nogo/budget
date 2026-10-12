package server

// messages holds every error text the API sends, per instance language.
// Keys "invalid.<field>" belong to a field error on that input.
var messages = map[string]map[string]string{
	"de": {
		"unauthorized":           "Bitte melde dich an.",
		"forbidden":              "Dieses Budget darfst du nicht öffnen.",
		"unsupported_media_type": "Die Anfrage muss JSON senden.",
		"bad_request":            "Die Anfrage ist ungültig.",
		"not_found":              "Nicht gefunden.",
		"duplicate_name":         "Diesen Namen gibt es schon.",
		"category_in_use":        "Die Kategorie wird noch von Buchungen oder Vorlagen benutzt.",
		"ledger_unavailable":     "Das Budget lässt sich gerade nicht öffnen.",
		"internal":               "Etwas ist schiefgegangen.",
		"invalid.amount":         "Der Betrag ist ungültig.",
		"invalid.type":           "Wähle Ausgabe oder Einnahme.",
		"invalid.categoryId":     "Wähle eine vorhandene Kategorie.",
		"invalid.category":       "Die Kategorie ist ungültig.",
		"invalid.categories":     "Die Kategorien sind ungültig.",
		"invalid.date":           "Das Datum ist ungültig.",
		"invalid.day":            "Der Tag muss zwischen 1 und 31 liegen.",
		"invalid.note":           "Die Notiz darf höchstens 500 Zeichen haben.",
		"invalid.name":           "Der Name darf nicht leer sein und höchstens 500 Zeichen haben.",
		"invalid.key":            "Der Eintragsschlüssel ist ungültig.",
		"invalid.month":          "Der Monat ist ungültig.",
		"invalid":                "Eine Eingabe ist ungültig.",
	},
	"en": {
		"unauthorized":           "Please sign in.",
		"forbidden":              "You may not open this budget.",
		"unsupported_media_type": "The request must send JSON.",
		"bad_request":            "The request is not valid.",
		"not_found":              "Not found.",
		"duplicate_name":         "This name already exists.",
		"category_in_use":        "The category is still used by transactions or templates.",
		"ledger_unavailable":     "The budget cannot be opened right now.",
		"internal":               "Something went wrong.",
		"invalid.amount":         "The amount is not valid.",
		"invalid.type":           "Choose expense or income.",
		"invalid.categoryId":     "Choose an existing category.",
		"invalid.category":       "The category is not valid.",
		"invalid.categories":     "The categories are not valid.",
		"invalid.date":           "The date is not valid.",
		"invalid.day":            "The day must be between 1 and 31.",
		"invalid.note":           "The note may have at most 500 characters.",
		"invalid.name":           "The name must not be empty and may have at most 500 characters.",
		"invalid.key":            "The entry key is not valid.",
		"invalid.month":          "The month is not valid.",
		"invalid":                "An input is not valid.",
	},
}

// message returns the text for code in lang, falling back to German and to
// the generic field message.
func message(lang, code string) string {
	table, ok := messages[lang]
	if !ok {
		table = messages["de"]
	}
	if m, ok := table[code]; ok {
		return m
	}
	if len(code) > len("invalid.") && code[:len("invalid.")] == "invalid." {
		return table["invalid"]
	}
	return table["internal"]
}
