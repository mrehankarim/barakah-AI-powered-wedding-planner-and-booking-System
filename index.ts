import app from "./app";

const PORT = process.env.PORT || 3000


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
//https://docs.prisma.io/docs/prisma-orm/quickstart/postgresql?utm_source=chatgpt.com
//https://docs.prisma.io/docs/orm/prisma-schema/overview?utm_source=chatgpt.com
//https://www.prisma.io/docs/orm/reference/prisma-schema-reference?utm_source=chatgpt.com