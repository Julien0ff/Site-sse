import json
import csv
import io
import re
import os

os.makedirs('src/data', exist_ok=True)
os.makedirs('public/logos', exist_ok=True)

# Parse schedules
with open('all_sheets_raw.json', 'r', encoding='utf-8') as f:
    raw_sheets = json.load(f)

# Limites construites en jeu (découpage strict de la réalité du jeu Roblox)
ingame_bounds = {
    '134_BREV': ('Chaillot-Batignolles RER', 'Sous-Préfecture – Champagne'),
    '134_CHAI': ('Sous-Préfecture – Champagne', 'Chaillot-Batignolles RER'),
    '135_BONN': ('Chaillot-Batignolles RER', 'Bismarck - Courboules'),
    '135_CHAI': ('Bismarck - Courboules', 'Chaillot-Batignolles RER'),
    '142_NOAI': ('Chaillot-Batignolles RER', 'Port-Perret - Village'),
    '142_CHAI': ('Port-Perret - Village', 'Chaillot-Batignolles RER'),
    '149_PASS': ('Chaillot-Batignolles RER', 'Église du Petit-Passy'),
    '149_CHAI': ('Église du Petit-Passy', 'Chaillot-Batignolles RER'),
    '233_HDVC': ('Narbérale RER', 'Hôtel de Ville de Chaillot-Batignolles'),
    '233_NARB': ('Hôtel de Ville de Chaillot-Batignolles', 'Narbérale RER'),
    '242P_PERR': ('Gare de Cramain - Université', 'Port-Perret – Village'),
    '242P_CRAM': ('Port-Perret – Village', 'Gare de Cramain - Université'),
    '257_ARLA': ('Berthée - Rosenberg', "Les Hauts d'Arlande"),
    '257_BERT': ("Les Hauts d'Arlande", 'Berthée - Rosenberg'),
    '315_BREO': ('Chaillot-Batignolles RER', 'Houssaye – De Gaulle'),
    '315_CHAI': ('Houssaye – De Gaulle', 'Chaillot-Batignolles RER'),
    '316_DAMP': ('Créteil - Valenton - Métro', 'Soufflot - TERMINUS PROVISOIRE/RUE DE CHERBOURG'),
    '316_CRET': ('Rue de Cherbourg', 'Créteil - Valenton - Métro'),
    '433_NARB': ('Berthée - Cramain RER', 'Narbérale RER'),
    '433_SARA': ('Narbérale RER', 'Berthée - Cramain RER'),
    '786_BOIS': ('Chaillot-Batignolles RER', 'Rosenberg'),
    '786_PLES': ('Rosenberg', 'Chaillot-Batignolles RER')
}

sheets_parsed = {}
for sheet_key, csv_content in raw_sheets.items():
    reader = list(csv.reader(io.StringIO(csv_content)))
    header_title = reader[0][0] if reader and reader[0] else ''
    
    raw_stops = [r for r in reader[2:] if r and r[0].strip() and not r[0].strip().lower().startswith(('arrêts', 'total', 'note', 'direction', 'ligne'))]
    all_raw_names = [s[0].strip() for s in raw_stops]
    
    if sheet_key in ingame_bounds:
        bound_s, bound_e = ingame_bounds[sheet_key]
        idx_s = next((i for i, s in enumerate(all_raw_names) if bound_s.lower() in s.lower()), 0)
        idx_e = next((i for i, s in enumerate(all_raw_names) if bound_e.lower() in s.lower()), len(all_raw_names) - 1)
        low, high = min(idx_s, idx_e), max(idx_s, idx_e)
        if idx_s > idx_e:
            sliced_raw_stops = list(reversed(raw_stops[low:high+1]))
        else:
            sliced_raw_stops = raw_stops[low:high+1]
    else:
        sliced_raw_stops = raw_stops
        
    stops = sliced_raw_stops
    all_stop_names = [s[0].strip() for s in stops]
    full_origin = all_stop_names[0] if all_stop_names else ''
    full_dest = all_stop_names[-1] if all_stop_names else ''
    num_cols = max(len(r) for r in stops) if stops else 0
    
    trips = []
    for col_idx in range(2, num_cols):
        trip_stops = []
        for s in stops:
            stop_name = s[0].strip()
            val = s[col_idx].strip() if col_idx < len(s) else ''
            if re.match(r'^[0-2]?[0-9]:[0-5][0-9]$', val):
                parts = val.split(':')
                val = f"{int(parts[0]):02d}:{parts[1]}"
            elif val == '|' or val == '/' or val == '--':
                val = ''
            trip_stops.append({'stop': stop_name, 'time': val})
            
        valid_times = [ts['time'] for ts in trip_stops if ts['time'] != '']
        if valid_times:
            active_stops = [ts for ts in trip_stops if ts['time'] != '']
            actual_orig = active_stops[0]['stop']
            actual_dest = active_stops[-1]['stop']
            is_limited = (actual_orig != full_origin) or (actual_dest != full_dest)
            
            dep_h, dep_m = map(int, valid_times[0].split(':'))
            arr_h, arr_m = map(int, valid_times[-1].split(':'))
            dep_total = dep_h * 60 + dep_m
            arr_total = arr_h * 60 + arr_m
            if arr_total < dep_total:
                arr_total += 1440
            duration_min = arr_total - dep_total
            
            note = "Service complet"
            if is_limited:
                if actual_dest != full_dest and actual_orig != full_origin:
                    note = f"Limité : {actual_orig} ➔ {actual_dest}"
                elif actual_dest != full_dest:
                    note = f"Terminus partiel : {actual_dest}"
                else:
                    note = f"Départ partiel : {actual_orig}"

            trips.append({
                'tripId': f"{sheet_key}_{col_idx}",
                'departureTime': valid_times[0],
                'arrivalTime': valid_times[-1],
                'durationMinutes': duration_min,
                'originStop': actual_orig,
                'destinationStop': actual_dest,
                'isLimitedService': is_limited,
                'serviceNote': note,
                'stopCount': len(active_stops),
                'totalRouteStops': len(all_stop_names),
                'stops': active_stops
            })
            
    trips.sort(key=lambda x: x['departureTime'])
    sheets_parsed[sheet_key] = {
        'sheetKey': sheet_key,
        'title': header_title,
        'fullOrigin': full_origin,
        'fullDestination': full_dest,
        'allStops': all_stop_names,
        'totalStops': len(all_stop_names),
        'totalTrips': len(trips),
        'limitedTripsCount': len([t for t in trips if t['isLimitedService']]),
        'trips': trips
    }

# Parse updated GIR Codes Spreadsheet (Seine-Sud-Est // Code Girouette)
with open('gir_spreadsheet.csv', 'r', encoding='utf-8') as f:
    gir_rows = list(csv.reader(f))

gir_by_line = {}
current_line = None
for r in gir_rows[2:]:
    line_label = r[0].strip() if r and len(r) > 0 else ''
    code = r[1].strip() if len(r) > 1 else ''
    city = r[2].strip() if len(r) > 2 else ''
    dest = r[3].strip() if len(r) > 3 else ''
    if line_label:
        current_line = line_label
    if code and current_line:
        if current_line not in gir_by_line:
            gir_by_line[current_line] = []
        gir_by_line[current_line].append({
            'code': code,
            'city': city,
            'destination': dest
        })

# Lignes officielles avec leurs codes exacts du tableur GIR
lines_list = [
    {
        "lineId": "134",
        "name": "134",
        "logoUrl": "/logos/134.png",
        "color": "#9A0E54",  # couleur du logo
        "textColor": "#FFFFFF",  # couleur du numéro sur le logo
        "spawnPoints": ['Chaillot-Batignolles RER', 'Hôtel de Ville de Chaillot-Batignolles'],
        "girCodes": gir_by_line.get('134', []),
        "directions": [
            {
                "dirId": "134_CHAI",
                "code": "134BR",
                "sheetKey": "134_CHAI",
                "destination": "Chaillot-Batignolles RER",
                "origin": "Sous-Préfecture – Champagne",
                "status": "En jeu : Chaillot ⥋ Sous-Préfecture"
            },
            {
                "dirId": "134_BREV",
                "code": "134AP",
                "sheetKey": "134_BREV",
                "destination": "Sous-Préfecture – Champagne",
                "origin": "Chaillot-Batignolles RER",
                "status": "En jeu : Chaillot ⥋ Sous-Préfecture"
            }
        ]
    },
    {
        "lineId": "135",
        "name": "135",
        "logoUrl": "/logos/135.png",
        "color": "#FFD700",  # couleur du logo
        "textColor": "#0A0612",  # couleur du numéro sur le logo
        "spawnPoints": ['Chaillot-Batignolles RER', 'Narbérale RER', 'La Vallée', 'Boulevard National - Mac Mahon', 'Cramain - Université RER'],
        "girCodes": gir_by_line.get('135', []),
        "directions": [
            {
                "dirId": "135_CHAI",
                "code": "135BR",
                "sheetKey": "135_CHAI",
                "destination": "Chaillot-Batignolles RER",
                "origin": "Bismarck – Courboules",
                "status": "En jeu : Chaillot ⥋ Bismarck / La Vallée"
            },
            {
                "dirId": "135_BONN",
                "code": "135BCS",
                "sheetKey": "135_BONN",
                "destination": "Bismarck – Courboules",
                "origin": "Chaillot-Batignolles RER",
                "status": "En jeu : Chaillot ⥋ Bismarck / La Vallée"
            }
        ]
    },
    {
        "lineId": "142",
        "name": "142",
        "logoUrl": "/logos/142.png",
        "color": "#C4A2CB",  # couleur du logo
        "textColor": "#0A0612",  # couleur du numéro sur le logo
        "spawnPoints": ['Chaillot-Batignolles RER', 'Pont de Narbérale - Quai Bourbon'],
        "girCodes": gir_by_line.get('142', []),
        "directions": [
            {
                "dirId": "142_CHAI",
                "code": "142BR",
                "sheetKey": "142_CHAI",
                "destination": "Chaillot-Batignolles RER",
                "origin": "Port-Perret – Village",
                "status": "En jeu : Chaillot ⥋ Port-Perret"
            },
            {
                "dirId": "142_NOAI",
                "code": "142PR",
                "sheetKey": "142_NOAI",
                "destination": "Port-Perret – Village",
                "origin": "Chaillot-Batignolles RER",
                "status": "En jeu : Chaillot ⥋ Port-Perret"
            }
        ]
    },
    {
        "lineId": "149",
        "name": "149",
        "logoUrl": "/logos/149.png",
        "color": "#847C3D",  # couleur du logo
        "textColor": "#FFFFFF",  # couleur du numéro sur le logo
        "spawnPoints": ['Chaillot-Batignolles RER'],
        "girCodes": gir_by_line.get('149', []),
        "directions": [
            {
                "dirId": "149_CHAI",
                "code": "149BR",
                "sheetKey": "149_CHAI",
                "destination": "Chaillot-Batignolles RER",
                "origin": "Pasteur (Le Petit-Passy)",
                "status": "En jeu : Chaillot ⥋ Pasteur"
            },
            {
                "dirId": "149_PASS",
                "code": "149DH",
                "sheetKey": "149_PASS",
                "destination": "Pasteur (Le Petit-Passy)",
                "origin": "Chaillot-Batignolles RER",
                "status": "En jeu : Chaillot ⥋ Pasteur"
            }
        ]
    },
    {
        "lineId": "233",
        "name": "233",
        "logoUrl": "/logos/233.png",
        "color": "#008080",  # couleur du logo
        "textColor": "#FFFFFF",  # couleur du numéro sur le logo
        "spawnPoints": ['Narbérale RER', 'Hôtel de Ville de Chaillot-Batignolles'],
        "girCodes": gir_by_line.get('233', []),
        "directions": [
            {
                "dirId": "233_HDVC",
                "code": "233CB",
                "sheetKey": "233_HDVC",
                "destination": "Hôtel de Ville de Chaillot-Batignolles",
                "origin": "Narbérale RER",
                "status": "Jouable intégralement"
            },
            {
                "dirId": "233_NARB",
                "code": "233NR",
                "sheetKey": "233_NARB",
                "destination": "Narbérale RER",
                "origin": "Hôtel de Ville de Chaillot-Batignolles",
                "status": "Jouable intégralement"
            }
        ]
    },
    {
        "lineId": "242",
        "name": "242",
        "logoUrl": "/logos/242.png",
        "color": "#0165FC",  # couleur du logo
        "textColor": "#FFFFFF",  # couleur du numéro sur le logo
        "spawnPoints": ['Gare de Cramain - Université'],
        "girCodes": gir_by_line.get('242', []),
        "directions": [
            {
                "dirId": "242P_CRAM",
                "code": "242CU",
                "sheetKey": "242P_CRAM",
                "destination": "Gare de Cramain – Université",
                "origin": "Port-Perret – Village",
                "status": "Parcours provisoire en jeu"
            },
            {
                "dirId": "242P_PERR",
                "code": "242PR",
                "sheetKey": "242P_PERR",
                "destination": "Port-Perret – Village",
                "origin": "Gare de Cramain - Université",
                "status": "Parcours provisoire en jeu"
            }
        ]
    },
    {
        "lineId": "257",
        "name": "257",
        "logoUrl": "/logos/257.png",
        "color": "#74DC65",  # couleur du logo
        "textColor": "#0A0612",  # couleur du numéro sur le logo
        "spawnPoints": ['Cramain - Université RER', 'Boulevard National - Mac Mahon', 'Fédération'],
        "girCodes": gir_by_line.get('257', []),
        "directions": [
            {
                "dirId": "257_BERT",
                "code": "257BR",
                "sheetKey": "257_BERT",
                "destination": "Berthée - Rosenberg",
                "origin": "Les Hauts d'Arlande",
                "status": "Jouable intégralement"
            },
            {
                "dirId": "257_ARLA",
                "code": "257HA",
                "sheetKey": "257_ARLA",
                "destination": "Les Hauts d'Arlande",
                "origin": "Berthée - Rosenberg",
                "status": "Jouable intégralement"
            }
        ]
    },
    {
        "lineId": "315",
        "name": "315",
        "logoUrl": "/logos/315.png",
        "color": "#DBAC29",  # couleur du logo
        "textColor": "#0A0612",  # couleur du numéro sur le logo
        "spawnPoints": ['Chaillot-Batignolles RER'],
        "girCodes": gir_by_line.get('315', []),
        "directions": [
            {
                "dirId": "315_CHAI",
                "code": "315BR",
                "sheetKey": "315_CHAI",
                "destination": "Chaillot-Batignolles RER",
                "origin": "Houssaye de Gaulle",
                "status": "En jeu : Chaillot ⥋ Houssaye"
            },
            {
                "dirId": "315_BREO",
                "code": "315CG",
                "sheetKey": "315_BREO",
                "destination": "Houssaye de Gaulle",
                "origin": "Chaillot-Batignolles RER",
                "status": "En jeu : Chaillot ⥋ Houssaye"
            }
        ]
    },
    {
        "lineId": "316",
        "name": "316",
        "logoUrl": "/logos/316.png",
        "color": "#F51C28",  # couleur du logo
        "textColor": "#FFFFFF",  # couleur du numéro sur le logo
        "spawnPoints": ['Rue de Cherbourg', 'Mairie de Narbérale', 'Cramain - Université RER'],
        "girCodes": gir_by_line.get('316', []),
        "directions": [
            {
                "dirId": "316_DAMP",
                "code": "316NC",
                "sheetKey": "316_DAMP",
                "destination": "Rue de Cherbourg (Narbérale)",
                "origin": "Denfert-La-Roche Hôtel de Ville",
                "status": "En jeu : Denfert ⥋ Rue de Cherbourg"
            },
            {
                "dirId": "316_CRET",
                "code": "316DMC",
                "sheetKey": "316_CRET",
                "destination": "Denfert-La-Roche Hôtel de Ville",
                "origin": "Rue de Cherbourg (Narbérale)",
                "status": "En jeu : Denfert ⥋ Rue de Cherbourg"
            }
        ]
    },
    {
        "lineId": "433",
        "name": "433",
        "logoUrl": "/logos/433.png",
        "color": "#00804C",  # couleur du logo
        "textColor": "#FFFFFF",  # couleur du numéro sur le logo
        "spawnPoints": ['Narbérale RER'],
        "girCodes": gir_by_line.get('433', []),
        "directions": [
            {
                "dirId": "433_NARB",
                "code": "433NG",
                "sheetKey": "433_NARB",
                "destination": "Narbérale RER",
                "origin": "Clémenceau (Cramain)",
                "status": "En jeu : Clémenceau ⥋ Narbérale"
            },
            {
                "dirId": "433_SARA",
                "code": "433CLZ",
                "sheetKey": "433_SARA",
                "destination": "Clémenceau (Cramain)",
                "origin": "Narbérale RER",
                "status": "En jeu : Clémenceau ⥋ Narbérale"
            }
        ]
    },
    {
        "lineId": "786",
        "name": "N76",
        "logoUrl": "/logos/N76.png",
        "color": "#F51C28",  # couleur du logo
        "textColor": "#FFFFFF",  # couleur du numéro sur le logo
        "spawnPoints": ['Chaillot-Batignolles RER', 'Narbérale RER', 'Gare de Narbérale', 'Cramain - Université RER - République', 'Cramain - Université - République'],
        "girCodes": gir_by_line.get('N76', []),
        "directions": [
            {
                "dirId": "786_BOIS",
                "code": "786BRP",
                "sheetKey": "786_BOIS",
                "destination": "Berthée - Rosenberg",
                "origin": "Chaillot-Batignolles RER",
                "status": "En jeu : Chaillot ⥋ Berthée - Rosenberg"
            },
            {
                "dirId": "786_PLES",
                "code": "786RB",
                "sheetKey": "786_PLES",
                "destination": "Chaillot-Batignolles RER",
                "origin": "Berthée - Rosenberg",
                "status": "En jeu : Chaillot ⥋ Berthée - Rosenberg"
            }
        ]
    }
]

# Codes spéciaux HLP (ordonnés numériquement sans emoji)
hlp_codes = [
    {"code": "60", "name": "En panne"},
    {"code": "61", "name": "Sans Voyageur"},
    {"code": "62", "name": "Voiture essai"},
    {"code": "63", "name": "Service spécial"},
    {"code": "64", "name": "Transport d'enfants"},
    {"code": "65", "name": "Retour Dépôt"},
    {"code": "66", "name": "Vide"},
    {"code": "67", "name": "Bus d'école"},
    {"code": "68", "name": "Bus en test"},
    {"code": "69", "name": "Challenge bus"},
    {"code": "70", "name": "Bus d'or"}
]
hlp_codes.sort(key=lambda x: int(x['code']))

database = {
    "lines": lines_list,
    "specialCodes": hlp_codes,
    "allGirCodes": gir_by_line,
    "sheets": sheets_parsed
}

with open('src/data/busData.json', 'w', encoding='utf-8') as f:
    json.dump(database, f, ensure_ascii=False, indent=2)

print("busData.json successfully rebuilt with updated GIR spreadsheet codes!")
