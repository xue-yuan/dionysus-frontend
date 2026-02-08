export const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
        'Spirit': '🥃',
        'Liqueur': '🧪',
        'Mixer': '🍋',
        'Syrup': '🍯',
        'Bitters': '💧',
        'Garnish': '🌿',
        'Other': '🔹'
    };
    return icons[category] || icons['Other'];
};
