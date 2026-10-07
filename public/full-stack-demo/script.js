const itemList = document.querySelector("#item-list");

(async () => {
	const res = await fetch("/api/v1/full-stack-demo/items");
	const content = await res.json();

	if (!res.ok)
	{
		console.error(content);
		return;
	}

	for (let i = 0; i < content.length; ++i)
	{
		const element = document.createElement("li");
		element.innerText = `#${content[i].Id} - ${content[i].Name} - "${content[i].Description}"`;

		itemList.appendChild(element);
	}
})();
