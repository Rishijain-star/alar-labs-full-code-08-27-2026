import { Bookmark } from "lucide-react";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import { useInitializePermissions } from "@/hooks/useInitializePermissions";
import {
  useGetFavoriteStatusQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "@/store/api/favoriteApi";

export function WishlistButton({ itemType, targetId, className }) {
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
  // Load permissions on public catalog pages too (Labs/Courses don't use RouteGuard)
  useInitializePermissions();

  const { data: status } = useGetFavoriteStatusQuery(undefined, {
    skip: !isAuthenticated || !targetId,
  });

  const [addFavorite, { isLoading: adding }] = useAddFavoriteMutation();
  const [removeFavorite, { isLoading: removing }] = useRemoveFavoriteMutation();

  if (!isAuthenticated || !targetId) return null;

  const ids = itemType === "course" ? status?.courseIds || [] : status?.labIds || [];
  const isFavorited = ids.some((id) => String(id) === String(targetId));
  const busy = adding || removing;

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (isFavorited) {
      await removeFavorite({ itemType, targetId });
    } else {
      await addFavorite({ itemType, targetId });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-md backdrop-blur-sm transition-colors",
        "hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        busy && "opacity-60",
        className,
      )}
    >
      <Bookmark
        className={cn(
          "h-4 w-4",
          isFavorited ? "fill-primary text-primary" : "text-foreground",
        )}
      />
    </button>
  );
}
