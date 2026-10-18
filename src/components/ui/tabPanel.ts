/** ARIA wiring for the panel that belongs to the selected `SegmentedTabs` tab. */
export function tabPanelProps(idBase: string, value: string) {
  return {
    id: `${idBase}-panel-${value}`,
    role: 'tabpanel',
    'aria-labelledby': `${idBase}-tab-${value}`,
  } as const
}
