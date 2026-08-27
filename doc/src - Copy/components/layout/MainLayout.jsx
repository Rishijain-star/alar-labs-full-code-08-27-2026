import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { SiteTopBar } from "./SiteTopBar";
import { useSiteTopbar } from "@/hooks/useSiteTopbar";
const MainLayout = () => {
  const topbar = useSiteTopbar();
  return (
    <>
      <SiteTopBar visible={topbar.visible} text={topbar.text} imageUrl={topbar.imageUrl} dismiss={topbar.dismiss} />
      <Navbar topOffset={topbar.visible} />
      <Outlet />
      <Footer />
    </>
  );
};

export default MainLayout;
