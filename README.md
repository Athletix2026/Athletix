# Athletix Demo

Boutique premium Athletix avec back-office connecte a Supabase.

## Pages publiques

- `index.html` : accueil boutique
- `tshirts.html` : page de vente des t-shirts
- `sweats.html` : page de vente du sweat
- `collections.html` : collections
- `about.html` : a propos

## Administration

- `admin-login.html` : connexion admin Supabase
- `admin.html` : dashboard
- `admin-products.html` : produits
- `admin-stocks.html` : stocks
- `admin-orders.html` : commandes
- `admin-clients.html` : clients

## Supabase

La configuration publique Supabase se trouve dans :

```text
assets/supabase-config.js
```

La clé utilisee ici est une publishable key. Les cles secretes Stripe/Supabase ne doivent jamais etre ajoutees dans le frontend.

## Lancement local

Depuis ce dossier :

```bash
python3 -m http.server 8098
```

Puis ouvrir :

```text
http://localhost:8098/
```

## Prochaine etape

Brancher Stripe Checkout avec une fonction serveur pour creer les sessions de paiement et un webhook pour enregistrer automatiquement les commandes dans Supabase.
