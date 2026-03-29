import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background py-12 px-4">
    <div className="max-w-2xl mx-auto prose prose-sm dark:prose-invert">
      <Link to="/" className="text-xs text-muted-foreground hover:underline mb-6 inline-block">← Retour</Link>
      <h1>Politique de Confidentialité</h1>
      <p><strong>Dernière mise à jour :</strong> 29 mars 2026</p>

      <h2>1. Collecte des données</h2>
      <p>L'application Chabbat Chalom collecte les données suivantes :</p>
      <ul>
        <li><strong>Compte utilisateur :</strong> adresse e-mail, prénom, nom, ville.</li>
        <li><strong>Localisation GPS :</strong> utilisée exclusivement pour calculer les horaires de prière et d'allumage des bougies selon votre position géographique. Elle n'est jamais partagée avec des tiers.</li>
        <li><strong>Données Zoom (si connecté) :</strong> adresse e-mail Zoom, jetons d'accès. Ces données sont chiffrées et stockées de manière isolée par utilisateur. Aucun autre utilisateur ne peut y accéder.</li>
        <li><strong>Notifications push :</strong> identifiants techniques d'abonnement pour l'envoi de rappels personnalisés.</li>
      </ul>

      <h2>2. Utilisation des données</h2>
      <p>Vos données sont utilisées uniquement pour :</p>
      <ul>
        <li>Calculer vos horaires de Chabbat, prières et fêtes.</li>
        <li>Envoyer des rappels personnalisés (Omer, allumage, cours).</li>
        <li>Créer des réunions Zoom sur <strong>votre propre compte</strong> (jamais sur celui d'un autre utilisateur).</li>
        <li>Gérer votre participation communautaire (Tehilim, Minyan, Chat).</li>
      </ul>

      <h2>3. Partage des données</h2>
      <p>Nous ne vendons, ne louons et ne partageons <strong>aucune donnée personnelle</strong> avec des tiers. Les données de localisation ne quittent jamais votre appareil sauf pour le calcul astronomique côté client.</p>

      <h2>4. Sécurité Zoom</h2>
      <p>Si vous connectez votre compte Zoom :</p>
      <ul>
        <li>Les jetons d'accès sont stockés de manière chiffrée côté serveur, isolés par votre identifiant unique.</li>
        <li>Aucun administrateur ou autre utilisateur ne peut voir vos réunions privées ni utiliser votre lien de démarrage (Start URL).</li>
        <li>Vous pouvez déconnecter votre compte Zoom à tout moment depuis les paramètres.</li>
        <li>Les jetons expirés sont automatiquement supprimés.</li>
      </ul>

      <h2>5. Conservation</h2>
      <p>Vos données sont conservées tant que votre compte est actif. La suppression du compte entraîne la suppression automatique de toutes les données associées (CASCADE).</p>

      <h2>6. Vos droits</h2>
      <p>Conformément au RGPD, vous pouvez à tout moment :</p>
      <ul>
        <li>Consulter et modifier vos données dans l'Espace Personnel.</li>
        <li>Demander la suppression de votre compte.</li>
        <li>Révoquer les autorisations GPS ou Zoom.</li>
      </ul>

      <h2>7. Contact</h2>
      <p>Pour toute question : contactez-nous via l'application ou par e-mail à l'adresse indiquée dans les paramètres.</p>
    </div>
  </div>
);

export default PrivacyPolicy;
