import { useState } from 'react';
import { BadgeDownloadDialog } from './BadgeDownloadDialog';

type BadgeDownloadTriggerProps = {
  fileName: string;
  getSvgElement: () => SVGSVGElement | null;
  triggerClassName?: string;
};

export function BadgeDownloadTrigger({ fileName, getSvgElement, triggerClassName }: BadgeDownloadTriggerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const triggerClass = ['primary-button', triggerClassName].filter(Boolean).join(' ');

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setDialogOpen(true)}>
        下载
      </button>
      <BadgeDownloadDialog
        open={dialogOpen}
        fileName={fileName}
        getSvgElement={getSvgElement}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
