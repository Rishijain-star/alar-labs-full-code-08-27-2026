import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { SiteTopBar } from "./SiteTopBar";
import { useSiteTopbar } from "@/hooks/useSiteTopbar";
import { isImmersiveLearningRoute, siteContentOffsetClass } from "@/lib/siteHeaderLayout";

const MainLayout = () => {
  const topbar = useSiteTopbar();
  const { pathname } = useLocation();
  const immersive = isImmersiveLearningRoute(pathname);

  return (
    <>
      {!immersive && (
        <SiteTopBar
          visible={topbar.visible}
          text={topbar.text}
          imageUrl={topbar.imageUrl}
          dismiss={topbar.dismiss}
        />
      )}
      {!immersive && <Navbar topOffset={topbar.visible} />}
      <div className={siteContentOffsetClass(topbar.visible, pathname)}>
        <Outlet />
      </div>
      {!immersive && <Footer />}
    </>
  );
};

export default MainLayout;
