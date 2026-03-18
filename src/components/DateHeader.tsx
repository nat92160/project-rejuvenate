import { motion } from "framer-motion";

const DateHeader = () => {
  const today = new Date();
  const formatted = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      className="text-center py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <p className="text-sm text-muted-foreground capitalize">{formatted}</p>
      <p className="font-hebrew text-gold-dark text-sm mt-1">כ״ט בַּאֲדָר תשפ״ו</p>
    </motion.div>
  );
};

export default DateHeader;
