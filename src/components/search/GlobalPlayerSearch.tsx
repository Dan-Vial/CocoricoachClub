import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Player {
  id: string;
  name: string;
  category_id: string;
  position?: string | null;
  categories: {
    name: string;
    club_id: string;
    clubs: {
      name: string;
    } | null;
  } | null;
}

interface GlobalPlayerSearchProps {
  categoryId?: string;
}

export function GlobalPlayerSearch({ categoryId: propCategoryId }: GlobalPlayerSearchProps = {}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  // Get categoryId from URL params if not provided as prop
  const { categoryId: urlCategoryId } = useParams();
  const activeCategoryId = propCategoryId || urlCategoryId;

  const { data: players, isLoading } = useQuery({
    queryKey: ["category-players", activeCategoryId],
    queryFn: async () => {
      let query = supabase
        .from("players")
        .select(`
          id,
          name,
          position,
          category_id,
          categories (
            name,
            club_id,
            clubs (
              name
            )
          )
        `)
        .order("name");

      // Filter by category if we have one
      if (activeCategoryId) {
        query = query.eq("category_id", activeCategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Player[];
    },
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (playerId: string) => {
    navigate(`/players/${playerId}`);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Rechercher un athlète...</span>
        <kbd className="hidden md:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={activeCategoryId ? "Rechercher dans cette catégorie..." : "Rechercher un athlète..."} />
        <CommandList>
          <CommandEmpty>
            {isLoading ? "Chargement..." : "Aucun athlète trouvé."}
          </CommandEmpty>
          <CommandGroup heading={activeCategoryId ? "Athlètes de la catégorie" : "Athlètes"}>
            {players?.map((player) => {
              const categoryName = player.categories?.name ?? "Catégorie";
              const clubName = player.categories?.clubs?.name;

              return (
                <CommandItem
                  key={player.id}
                  value={player.name}
                  onSelect={() => handleSelect(player.id)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {player.position && `${player.position} • `}
                      {categoryName}
                      {clubName && !activeCategoryId ? ` • ${clubName}` : ""}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
