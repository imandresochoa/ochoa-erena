"use client";

type Props = {
  visible: boolean;
  onRestore: () => void;
};

export function RestaurarButton({ visible, onRestore }: Props) {
  if (!visible) {
    return null;
  }
  return (
    <button type="button" onClick={onRestore} className="chrome-ctl">
      Restaurar
    </button>
  );
}
