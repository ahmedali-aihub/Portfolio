// Every skill an item can be matched on: its stack plus its tags.
export const skillsOf = (item) => new Set([...(item.stack ?? []), ...(item.tags ?? [])]);
