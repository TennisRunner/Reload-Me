









function sleep(amount)
{
	return new Promise((resolve) => setTimeout(resolve, amount));
}

class Config
{
	constructor()
	{
		this.configKey = "reload-me-config";

		this.monitorAll = false;
		this.whitelistedUrls = Array();
		this.whitelistedDomains = Array();
		this.blacklistedDomains = Array();
		this.blacklistedUrls = Array();

		this.lastScrollTop = 0;
	}

	load()
	{
		let text = localStorage.getItem(this.configKey);

		if(text && text.length > 0)
		{
			let data = JSON.parse(text);
			Object.assign(this, data);
		}
	}

	save()
	{
		localStorage.setItem(this.configKey, JSON.stringify(this)); 
	}

	refreshLastHeight()
	{
		this.lastScrollTop = window.scrollTop;
	}
}

var config = new Config();
config.load();


var PROMPT_RESPONSES = 
{
	YES_ALL: 0,
	YES_DOMAIN: 1,
	YES: 2,
	NO: 3,
	NO_DOMAIN: 4
}

function prompt(url)
{
	return new Promise(async (resolve) =>
	{
		let prompt = document.createElement("div");

		prompt.setAttribute("id", "reload-me-prompt");

		prompt.innerHTML = `
			<div class="modal">
				<p>
					Do you want to monitor this file for changes?
					<br />
					<br />
					${url.href}
					<br />
					<br />
					<button class="yes">Yes</button>
					<button class="no">No</button>
					<br />
					<button class="yes-all">Yes to all urls (dangerous)</button>
					<br />
					<button class="yes-domain">Yes to all urls from ${url.host}</button>
					<br />
					<button class="no-domain">No to all urls from ${url.host}</button>
				</p>
			</div>
		`;

		document.querySelector("body").appendChild(prompt);

		function respond(val)
		{
			prompt.parentNode.removeChild(prompt);

			resolve(val);
		}

		prompt.querySelector(".yes").addEventListener("click", function()
		{
			respond(PROMPT_RESPONSES.YES);
		});

		prompt.querySelector(".yes-all").addEventListener("click", function()
		{
			respond(PROMPT_RESPONSES.YES_ALL);
		});

		prompt.querySelector(".yes-domain").addEventListener("click", function()
		{
			respond(PROMPT_RESPONSES.YES_DOMAIN);
		});

		prompt.querySelector(".no").addEventListener("click", function()
		{
			respond(PROMPT_RESPONSES.NO);
		});

		prompt.querySelector(".no-domain").addEventListener("click", function()
		{
			respond(PROMPT_RESPONSES.NO_DOMAIN);
		});
	});
}

function getCurrentDirectory()
{
	var parts = new URL(window.location.origin + window.location.pathname);


	var fileExtensions = Array(
		"php",
		"html",
		"htm"
	);

	res = window.location.origin;

	var temp = window.location.pathname.toLowerCase();

	if(fileExtensions.filter(x => temp.endsWith("." + x)).length > 0)
	{
		res += window.location.pathname.split("/").slice(0, -1).join("/");
	}
	else
		res += window.location.pathname;

	return res;
}

async function main()
{
	let style = document.createElement("style");

	style.setAttribute("type", "text/css");
	style.innerHTML = `
		#reload-me-prompt{
			background-color:rgba(0, 0, 0, 0.5);
			top:0px;
			bottom:0px;
			left:0px;
			right:0px;
			position:fixed;
			z-index:100000000;
			text-align:center;
		}

		#reload-me-prompt .modal{
			padding:20px;
			background-color:white;
			display:inline-block;
			position: relative;
			top: 50%;
			transform: translateY(-50%);
			color:black !important;
		}

		#reload-me-prompt .modal button{
			margin:5px;
		}
	`;

	document.head.appendChild(style);


	window.scrollTo(0, config.lastScrollTop);


	var convertedUrls = Array();
	var monitorResults = Array();

	while(true)
	{
		var urls = Array();

		urls.push(window.location.href);


		for(let link of document.querySelectorAll("link"))
		{
			let url = link.getAttribute("href");

			if(url && url.length > 0)
				urls.push(url);
		}

		for(let link of document.querySelectorAll("script"))
		{
			let url = link.getAttribute("src");

			if(url && url.length > 0)
				urls.push(url);
		}

		for(let url of urls)
		{
			try
			{
				let el = null;

				if(convertedUrls[url] == null)
				{
					let newUrl = url;

					try
					{
						if(newUrl.startsWith("./") == true)
							newUrl = newUrl.substring(2);

						if(newUrl.startsWith("/") == true && url.startsWith("://") == false)
							newUrl = newUrl.substring(1);

						el = new URL(newUrl);
					}
					catch(err)
					{
						newUrl = getCurrentDirectory() + "/" + newUrl;
						el = new URL(newUrl);
					}

					convertedUrls[url] = el;
				}
				else
					el = convertedUrls[url];


				var allowed = false;

				if(config.monitorAll == true)
					allowed = true;
				else if(config.whitelistedDomains.indexOf(el.host) != -1)
					allowed = true;
				else if(config.whitelistedUrls.indexOf(el.href) != -1)
					allowed = true;

				if(config.blacklistedUrls.indexOf(el.href) != -1 ||
				   config.blacklistedDomains.indexOf(el.host) != -1)
					continue;

				if(allowed == false)
				{
					let res = await prompt(el);

					if(res == PROMPT_RESPONSES.YES)
					{
						allowed = true;
						config.whitelistedUrls.push(el.href);
						config.save();
					}
					else if(res == PROMPT_RESPONSES.NO)
					{
						config.blacklistedUrls.push(el.href);
						config.save();
					}
					else if(res == PROMPT_RESPONSES.YES_ALL)
					{
						allowed = true;
						config.monitorAll = true;
						config.save();
					}
					else if(res == PROMPT_RESPONSES.YES_DOMAIN)
					{
						allowed = true;
						config.whitelistedDomains.push(el.host);
						config.save();
					}
					else if(res == PROMPT_RESPONSES.NO_DOMAIN)
					{
						config.blacklistedDomains.push(el.host);
						config.save();
					}
				}

				if(allowed == false)
					continue;

				
				let res = await fetch(el.href, 
				{
					method: "HEAD"
				});

				if(res.status != 200)
				{
					console.error(`Status is ${res.status}, expected 200`);
					continue;
				}

				let lastModified = res.headers.get("Last-Modified");

				if(monitorResults[url] == null)
					monitorResults[url] = lastModified;

				if(monitorResults[url] != lastModified)
				{
					console.log(`Url ${el.href} has changed, reloading`);

					config.refreshLastHeight();
					config.save();

					window.location.href = window.location.href;

					monitorResults[url] = lastModified;
				}
			}
			catch(err)
			{
				
			}
		}

		await sleep(1000);
	}
}

window.addEventListener("load", function()
{
	main();
});
