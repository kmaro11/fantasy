import { DetailPanel } from "@/components/board/detail-panel";
import { PlayerTable } from "@/components/board/player-table";
import { RosterSidebar } from "@/components/board/roster-sidebar";

export default function BoardPage() {
  return (
    <div className="flex min-h-0 flex-1 overflow-x-auto">
      <PlayerTable />
      <DetailPanel />
      <RosterSidebar />
    </div>
  );
}
