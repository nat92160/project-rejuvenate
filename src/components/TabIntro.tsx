const INTROS: Record<string, string> = {
  dashboard: "Vos zmanim du jour et raccourcis essentiels.",
  synagogue: "Votre synagogue : horaires, annonces et fidèles.",
  chabbat: "Tout pour préparer Chabbat : compte à rebours, paracha, allumage.",
  zmanim: "Les heures halakhiques précises selon votre position.",
  siddour: "Le siddour séfarade complet, adapté à l'office en cours.",
  tehilim: "Lire ou rejoindre une lecture collective de Tehilim.",
  tehilimlibre: "Lire ou rejoindre une lecture collective de Tehilim.",
  refoua: "Prier pour la guérison d'un proche, ensemble.",
  brakhot: "Les bénédictions quotidiennes à portée de main.",
  fetes: "Toutes les fêtes juives et leurs dates.",
  roshhodesh: "Le calendrier des nouveaux mois hébraïques.",
  shabbatspec: "Les Chabbatot particuliers à connaître.",
  mariages: "Dates halakhiques pour mariages et hazkarot.",
  convertisseur: "Convertir une date civile ↔ hébraïque.",
  mizrah: "Boussole orientée vers Jérusalem.",
  reveil: "Réveil et alarme pour ne rien manquer.",
  annonces: "Annonces officielles de votre communauté.",
  evenements: "Les prochains événements de la communauté.",
  coursvirtuel: "Cours de Torah en visio, en direct ou en replay.",
  courszoom: "Cours de Torah en visio, en direct ou en replay.",
  minyan: "Lancer ou rejoindre une alerte minyan en urgence.",
  perso: "Vos dates personnelles : hilloula, bar-mitsva, anniversaires.",
  affiche: "L'affiche de Chabbat de votre synagogue.",
  horaires: "Les horaires de prière de votre synagogue.",
  infosyna: "Le profil et les infos de votre synagogue.",
  alerte: "Diffuser une alerte communautaire ciblée.",
  "mikve-info": "Horaires, contact et réservation du mikvé.",
  chooser: "Choisir votre synagogue de rattachement.",
  communaute: "L'espace d'échange de votre communauté.",
  explorer: "Découvrir d'autres communautés près de vous.",
};

interface Props {
  tab: string;
}

const TabIntro = ({ tab }: Props) => {
  const text = INTROS[tab];
  if (!text) return null;
  return (
    <p
      className="text-center text-[11px] text-muted-foreground/80 mb-3 px-2 leading-snug"
      style={{ fontStyle: "italic" }}
    >
      {text}
    </p>
  );
};

export default TabIntro;