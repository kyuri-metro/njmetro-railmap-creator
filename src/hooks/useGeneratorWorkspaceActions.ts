import { startTransition, useState, type ChangeEvent } from 'react';
import type { AutosaveEntry } from '../autosaveStorage';
import { getBuiltinJianbanStationsByLineId } from '../builtinJianbanLineStations';
import { getBuiltinOpenedStationsByLineId } from '../builtinOpenedLineStations';
import type { BuiltinStationNetwork } from '../components/FillStationsByLineMenu';
import { markSavedExempt } from '../features/leaveGuard';
import { builtinLineToGeneratorState, railmapImportToGeneratorState } from '../features/generatorImport';
import {
  getEmptyGeneratorState,
  restoreGeneratorState,
  type GeneratorState,
} from '../features/generatorSlice';
import { useAppDispatch } from '../hooks';
import { parseRailmapYaml, serializeRailmapYaml, type RailmapYamlImport } from '../stationListYaml';
import { UndoActionCreators } from '../store';

type UseGeneratorWorkspaceActionsParams = {
  generator: GeneratorState;
  syncControlDraftsFromGenerator: (state: GeneratorState) => void;
  onAfterAutosaveRestore?: () => void;
};

export function useGeneratorWorkspaceActions({
  generator,
  syncControlDraftsFromGenerator,
  onAfterAutosaveRestore,
}: UseGeneratorWorkspaceActionsParams) {
  const dispatch = useAppDispatch();

  const [isAutosaveRestoreConfirmOpen, setIsAutosaveRestoreConfirmOpen] = useState(false);
  const [pendingAutosaveEntry, setPendingAutosaveEntry] = useState<AutosaveEntry | null>(null);
  const [isOverwriteStationsConfirmOpen, setIsOverwriteStationsConfirmOpen] = useState(false);
  const [pendingBuiltinFill, setPendingBuiltinFill] = useState<{
    network: BuiltinStationNetwork;
    lineId: string;
  } | null>(null);
  const [isNewProjectConfirmOpen, setIsNewProjectConfirmOpen] = useState(false);
  const [isYamlImportConfirmOpen, setIsYamlImportConfirmOpen] = useState(false);
  const [pendingRailmapImport, setPendingRailmapImport] = useState<RailmapYamlImport | null>(null);
  const [yamlImportError, setYamlImportError] = useState<string | null>(null);

  const applyRestoredState = (nextState: GeneratorState) => {
    syncControlDraftsFromGenerator(nextState);
    startTransition(() => {
      dispatch(restoreGeneratorState(nextState));
      dispatch(UndoActionCreators.clearHistory());
    });
  };

  const dismissAutosaveRestoreConfirm = () => {
    setIsAutosaveRestoreConfirmOpen(false);
    setPendingAutosaveEntry(null);
  };

  const handleExportStationYaml = () => {
    const yml = serializeRailmapYaml(generator);
    const blob = new Blob([yml], { type: 'text/yaml;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = objectUrl;
    downloadLink.download = 'railmap.yml';
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.URL.revokeObjectURL(objectUrl);
    markSavedExempt();
  };

  const applyYamlTextForImport = (text: string) => {
    const result = parseRailmapYaml(text, generator);

    if (!result.ok) {
      setYamlImportError(result.message);
      return;
    }

    setPendingRailmapImport(result.data);
    setIsYamlImportConfirmOpen(true);
  };

  const handleYamlFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      applyYamlTextForImport(String(reader.result ?? ''));
    };

    reader.onerror = () => {
      setYamlImportError('读取文件失败。');
    };

    reader.readAsText(file, 'UTF-8');
  };

  const confirmYamlStationImport = () => {
    if (!pendingRailmapImport) {
      return;
    }

    setIsYamlImportConfirmOpen(false);
    setPendingRailmapImport(null);
    applyRestoredState(railmapImportToGeneratorState(pendingRailmapImport, generator));
  };

  const requestBuiltinStationOverwrite = (network: BuiltinStationNetwork, lineId: string) => {
    setPendingBuiltinFill({ network, lineId });
    setIsOverwriteStationsConfirmOpen(true);
  };

  const confirmBuiltinStationOverwrite = () => {
    setIsOverwriteStationsConfirmOpen(false);

    if (!pendingBuiltinFill) {
      return;
    }

    const { network, lineId } = pendingBuiltinFill;
    setPendingBuiltinFill(null);

    const builtinStations =
      network === 'opened'
        ? getBuiltinOpenedStationsByLineId(lineId)
        : getBuiltinJianbanStationsByLineId(lineId);

    if (!builtinStations) {
      return;
    }

    applyRestoredState(builtinLineToGeneratorState(lineId, builtinStations, generator, network));
  };

  const handleAutosaveEntrySelect = (entry: AutosaveEntry) => {
    setPendingAutosaveEntry(entry);
    setIsAutosaveRestoreConfirmOpen(true);
  };

  const confirmNewProject = () => {
    setIsNewProjectConfirmOpen(false);
    applyRestoredState(getEmptyGeneratorState());
  };

  const confirmAutosaveRestore = () => {
    if (!pendingAutosaveEntry) {
      return;
    }

    const result = parseRailmapYaml(pendingAutosaveEntry.yaml, generator);

    if (!result.ok) {
      dismissAutosaveRestoreConfirm();
      setYamlImportError(result.message);
      return;
    }

    dismissAutosaveRestoreConfirm();
    onAfterAutosaveRestore?.();
    applyRestoredState(railmapImportToGeneratorState(result.data, generator));
  };

  return {
    isAutosaveRestoreConfirmOpen,
    pendingAutosaveEntry,
    isOverwriteStationsConfirmOpen,
    isNewProjectConfirmOpen,
    setIsNewProjectConfirmOpen,
    isYamlImportConfirmOpen,
    yamlImportError,
    setYamlImportError,
    dismissAutosaveRestoreConfirm,
    handleExportStationYaml,
    applyYamlTextForImport,
    handleYamlFileChange,
    confirmYamlStationImport,
    requestBuiltinStationOverwrite,
    confirmBuiltinStationOverwrite,
    handleAutosaveEntrySelect,
    confirmNewProject,
    confirmAutosaveRestore,
    dismissNewProject: () => setIsNewProjectConfirmOpen(false),
    dismissYamlImport: () => {
      setIsYamlImportConfirmOpen(false);
      setPendingRailmapImport(null);
    },
    dismissOverwriteStations: () => {
      setIsOverwriteStationsConfirmOpen(false);
      setPendingBuiltinFill(null);
    },
    dismissYamlError: () => setYamlImportError(null),
  };
}
