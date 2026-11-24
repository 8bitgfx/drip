<script setup lang="ts">
defineProps<{ label: string; tone?: "neutral" | "accent" | "danger" }>();
</script>
<template>
  <span class="tag" :class="tone">{{ label }}</span>
</template>
<style>
.tag { padding: 2px 8px; }
</style>
