import { createFileRoute } from "@tanstack/react-router";
import { MapPage } from "@/components/sooqy/MapPage";
import { translate } from "@/lib/i18n";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: translate("map_seo_title") },
      { name: "description", content: translate("map_seo_description") },
    ],
  }),
  component: MapPage,
});
