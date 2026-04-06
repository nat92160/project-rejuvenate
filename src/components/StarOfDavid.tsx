import appLogoIcon from "@/assets/chabbat-chalom-logo-ui.png";

const StarOfDavid = ({ size = 80 }: { size?: number }) => (
  <img
    src={appLogoIcon}
    width={size}
    height={size}
    alt="Logo Chabbat Chalom"
    loading="lazy"
    className="rounded-2xl object-contain"
  />
);

export default StarOfDavid;
