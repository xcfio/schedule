import type { APIComponentInContainer, RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/v10"
import { ButtonStyle, ComponentType } from "discord-api-types/v10"
import list from "../lists.json" with { type: "json" }
import * as cheerio from "cheerio"

const res = await fetch(
    "https://store.steampowered.com/franchise/tswofficial/ajaxgetfilteredrecommendations/render/?query=&start=0&count=10&tagids=&sort=discounted&app_types=&curations=&reset=true",
    {
        method: "GET",
        body: null,
        headers: {
            accept: "text/javascript, text/html, application/xml, text/xml, */*",
            "accept-language": "en-US,en;q=0.9,bn;q=0.8",
            "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-prototype-version": "1.7",
            "x-requested-with": "XMLHttpRequest",
            cookie: "timezoneOffset=21600,0; timezoneName=Asia/Dhaka;",
            Referer: "https://store.steampowered.com/franchise/tswofficial"
        }
    }
)

const json = (await res.json()) as any
const $ = cheerio.load(json.results_html)

const name = $(".color_created")
    .map((_, el) => $(el).text().trim())
    .get()

const url = $(".recommendation_link")
    .map((_, el) => {
        const anchor = $(el).is("a") ? $(el) : $(el).find("a").first()
        const href = anchor.attr("href") || null
        if (!href) return null
        try {
            return new URL(href, "https://store.steampowered.com").toString().split("?").shift()
        } catch {
            return null
        }
    })
    .get()
    .filter((x): x is string => Boolean(x))

const pct = $(".discount_pct")
    .map((_, el) => $(el).text().trim())
    .get()

const op = $(".discount_original_price")
    .map((_, el) => $(el).text().trim())
    .get()

const fp = $(".discount_final_price")
    .map((_, el) => $(el).text().trim())
    .get()

const length = (name.length + url.length + pct.length + op.length + fp.length) / 5
if (
    length !== name.length ||
    length !== url.length ||
    length !== pct.length ||
    length !== op.length ||
    length !== fp.length
) {
    throw new Error("Array lengths do not match")
}

const discounts = Array.from({ length }, (_, i) => ({ name: name[i], url: url[i], pct: pct[i], op: op[i], fp: fp[i] }))
console.log(discounts)

const filtered: typeof discounts = []
for (const item of discounts) {
    if (!list.includes(item.name)) continue
    filtered.push(item)
}

if (filtered.length) {
    const components: Array<APIComponentInContainer> = [
        {
            type: ComponentType.TextDisplay,
            content: `Steam Discounts - ${new Date().toISOString().split("T")[0]}`
        },
        {
            type: ComponentType.Separator
        }
    ]

    filtered.forEach((x, index, { length }) => {
        components.push({
            type: ComponentType.Section,
            components: [
                {
                    type: ComponentType.TextDisplay,
                    content: `${x.name}\nOriginal Price: ${x.op}\nFinal Price: ${x.fp}\nDiscount: ${x.pct}`
                }
            ],
            accessory: {
                url: x.url,
                label: "More Info",
                style: ButtonStyle.Link,
                type: ComponentType.Button
            }
        })

        if (index < length + 1) components.push({ type: ComponentType.Separator })
    })

    const payload: RESTPostAPIWebhookWithTokenJSONBody = {
        flags: 1 << 15,
        components: [
            {
                type: ComponentType.Container,
                components: components
            }
        ]
    }

    const x = await fetch(process.env.URL ?? "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })

    console.log(`Webhook send status: ${x.status}`)
}
