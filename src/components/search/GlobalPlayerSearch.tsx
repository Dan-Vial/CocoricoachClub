import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  categories: {
    name: string;
    club_id: string;
    clubs: {
      name: string;
    };
  };
}

export function GlobalPlayerSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: players, isLoading } = useQuery({
    queryKey: ["all-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select(`
          id,
          name,
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
        <span className="hidden md:inline">Rechercher un joueur...</span>
        <kbd className="hidden md:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher un joueur par nom..." />
        <CommandList>
          <CommandEmpty>
            {isLoading ? "Chargement..." : "Aucun joueur trouvé."}
          </CommandEmpty>
          <CommandGroup heading="Joueurs">
            {players?.map((player) => (
              <CommandItem
                key={player.id}
                value={player.name}
                onSelect={() => handleSelect(player.id)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{player.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {player.categories.name} • {player.categories.clubs.name}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
