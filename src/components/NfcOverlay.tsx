import Button from './Button';

type NfcConfirmOverlayProps = {
  amountMl: number;
  totalToday: number;
  targetMl: number;
  onDismiss: () => void;
};

export function NfcConfirmOverlay({ amountMl, totalToday, targetMl, onDismiss }: NfcConfirmOverlayProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onDismiss}
      onKeyDown={(event) => event.key === 'Enter' && onDismiss()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-bg px-6 text-center"
    >
      <span className="text-5xl font-bold text-accent">+{amountMl} ml</span>
      <span className="text-lg text-text">
        {totalToday} / {targetMl} ml
      </span>
      <span className="text-sm text-text-muted">Tik om verder te gaan</span>
    </div>
  );
}

type NfcDuplicatePromptProps = {
  amountMl: number;
  source: 'nfc' | 'shortcut';
  onConfirm: () => void;
  onCancel: () => void;
};

const SOURCE_LABEL: Record<NfcDuplicatePromptProps['source'], string> = {
  nfc: 'NFC',
  shortcut: 'de snelkoppeling'
};

export function NfcDuplicatePrompt({ amountMl, source, onConfirm, onCancel }: NfcDuplicatePromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <div className="flex flex-col gap-2">
        <span className="text-xl font-semibold text-text">Nog een fles loggen?</span>
        <span className="text-sm text-text-muted">
          Er is net al {amountMl} ml via {SOURCE_LABEL[source]} geregistreerd.
        </span>
      </div>
      <div className="flex gap-3">
        <Button variant="raised" onClick={onCancel}>
          Nee
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Ja, nog een fles
        </Button>
      </div>
    </div>
  );
}
