import { Link } from "react-router-dom";

const TermsOfService = () => (
  <div className="min-h-screen bg-background py-12 px-4">
    <div className="max-w-2xl mx-auto prose prose-sm dark:prose-invert">
      <Link to="/" className="text-xs text-muted-foreground hover:underline mb-6 inline-block">← Retour</Link>
      <h1>Conditions Générales d'Utilisation</h1>
      <p><strong>Dernière mise à jour :</strong> 29 mars 2026</p>

      <h2>1. Objet</h2>
      <p>Les présentes CGU régissent l'utilisation de l'application Chabbat Chalom, destinée à faciliter la pratique religieuse juive (horaires, prières, communauté).</p>

      <h2>2. Inscription</h2>
      <p>L'inscription est gratuite. L'accès à certaines fonctionnalités (chat, création de cours, espace personnel) nécessite un compte vérifié par e-mail.</p>

      <h2>3. Utilisation de Zoom</h2>
      <ul>
        <li>L'intégration Zoom est optionnelle. Chaque utilisateur connecte <strong>son propre compte Zoom</strong>.</li>
        <li>L'application n'accède qu'aux scopes nécessaires (création de réunions, consultation du profil).</li>
        <li>Les administrateurs de l'application n'ont <strong>aucun accès</strong> aux comptes Zoom des utilisateurs.</li>
        <li>L'utilisateur peut révoquer l'accès Zoom à tout moment.</li>
      </ul>

      <h2>4. Responsabilités</h2>
      <ul>
        <li>Les horaires de prière sont calculés algorithmiquement et fournis à titre indicatif. Consultez votre rabbin pour les cas particuliers.</li>
        <li>L'application ne garantit pas la disponibilité permanente des services tiers (Zoom, notifications push).</li>
        <li>Chaque utilisateur est responsable du contenu qu'il publie (annonces, messages de chat).</li>
      </ul>

      <h2>5. Propriété intellectuelle</h2>
      <p>Le contenu liturgique (Tehilim, Siddour, Brakhot) est issu de sources traditionnelles du domaine public. Le design et le code de l'application sont protégés.</p>

      <h2>6. Données personnelles</h2>
      <p>Le traitement des données est décrit dans notre <Link to="/privacy">Politique de Confidentialité</Link>.</p>

      <h2>7. Modération</h2>
      <p>Le chat de synagogue est modéré par le président de la synagogue. Les contenus inappropriés peuvent être supprimés et les utilisateurs suspendus.</p>

      <h2>8. Modification</h2>
      <p>Ces CGU peuvent être modifiées à tout moment. Les utilisateurs seront informés des modifications importantes.</p>

      <h2>9. Droit applicable</h2>
      <p>Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux de Paris sont compétents.</p>
    </div>
  </div>
);

export default TermsOfService;
