<script setup lang="ts">
defineProps<{ name: string; size?: number }>();
const paths: Record<string, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  image: "M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M8 8h.01",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  undo: "M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12",
  redo: "m15 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  check: "m5 12 4 4L19 6",
  edit: "m4 17 10-10 3 3L7 20H4zm10-10 3-3 3 3-3 3",
  layers: "m12 3 10 5-10 5L2 8zm-9 10 9 5 9-5m-18 5 9 5 9-5",
  replace: "M3 8h15m-4-4 4 4-4 4M21 16H6m4-4-4 4 4 4",
  remove: "M5 6h14M9 6V3h6v3M7 6l1 15h8l1-15M10 10v7m4-7v7",
  file: "M14 2H5v20h14V7zm0 0v5h5M8 12h8m-8 4h8",
  grid: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  chevron: "m9 5 7 7-7 7",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  replay: "M4 10a8 8 0 1 1 1 8M4 4v6h6",
};
</script>
<template>
  <svg
    :width="size || 18"
    :height="size || 18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.arrow" />
  </svg>
</template>
