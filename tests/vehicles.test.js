const { app } = require("../src/server")
const request = require("supertest")
const mongoose = require("mongoose")
require("dotenv").config()

let cookie

beforeAll(async () => {
  mongoose.set("strictQuery", false)
  await mongoose.connect(process.env.MONGO_URI)

  const response = await request(app).post("/users/login").send({
    username: "user",
    password: "password",
  })

  cookie = response.get("Set-Cookie")
})

afterAll(async () => {
  await mongoose.connection.close()
})

describe("GET /vehicles", () => {
  it("should return a list of all available vehicles", async () => {
    const response = await request(app).get("/vehicles").send()
    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
  })

  it("should filter vehicles based on location", async () => {
    const response = await request(app).get("/vehicles?location=Surry+Hills,+NSW").send()
    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
  })

  it("should filter vehicles based on transmission", async () => {
    const response = await request(app).get("/vehicles?transmission=Automatic").send()
    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
  })
})

describe("POST /vehicles", () => {
  it("should create a new vehicle", async () => {
    const profileResponse = await request(app).get("/users/profile").set("Cookie", cookie).send()
    const userId = profileResponse.body._id
    const response = await request(app).post("/vehicles").set("Cookie", cookie).send({
      transmission: "Automatic",
      owner_id: userId,
      price_per_day: 90,
      location: "Surry Hills, NSW",
      availability: true,
      description: "Best",
    })

    expect(response.statusCode).toBe(200)
  })
})

describe("GET /vehicles/:vehicleId", () => {
  it("should return details of a vehicle", async () => {
    const profileResponse = await request(app).get("/users/profile").set("Cookie", cookie).send()
    const userId = profileResponse.body._id
    const createResponse = await request(app).post("/vehicles").set("Cookie", cookie).send({
      transmission: "Automatic",
      owner_id: userId,
      price_per_day: 90,
      location: "Surry Hills, NSW",
      availability: true,
      description: "Best",
    })
    const response = await request(app)
      .get("/vehicles/" + createResponse.body._id)
      .send()
    expect(response.statusCode).toBe(200)
    expect(response.body.owner_id).toBe(userId)
  })

  it("should return 404 if the vehicle does not exist", async () => {
    const response = await request(app).get("/vehicles/does-not-exist").send()
    expect(response.statusCode).toBe(404)
  })
})

describe("PUT /vehicles/:vehicleId", () => {
  it("should return 404 if the vehicle does not exist", async () => {
    const response = await request(app).put("/vehicles/does-not-exist").set("Cookie", cookie).send()
    expect(response.statusCode).toBe(404)
  })

  it("should return details of updated vehicle", async () => {
    const profileResponse = await request(app).get("/users/profile").set("Cookie", cookie).send()
    const userId = profileResponse.body._id
    const createResponse = await request(app).post("/vehicles").set("Cookie", cookie).send({
      transmission: "Manual",
      owner_id: userId,
      price_per_day: 90,
      location: "Surry Hills, NSW",
      availability: true,
      description: "Best",
    })
    const response = await request(app)
      .put("/vehicles/" + createResponse.body._id)
      .set("Cookie", cookie)
      .send()
    expect(response.statusCode).toBe(200)
  })
})

describe("POST /vehicles/:vehicleId/rating", () => {
  it("should add a new rating for vehicle", async () => {
    const vehiclesResponse = await request(app).get("/vehicles").send()
    const vehicleId = vehiclesResponse.body[0].vehicle_id

    const response = await request(app)
      .post("/vehicles/" + vehicleId + "/rating")
      .set("Cookie", cookie)
      .send({ vehicle_id: vehicleId, rating: 3 })
    expect(response.statusCode).toBe(200)
  })
})

describe("GET /vehicles/:vehicleId/rating", () => {
  it("should get an average rating for vehicle", async () => {
    const vehiclesResponse = await request(app).get("/vehicles").send()
    const vehicleId = vehiclesResponse.body[0].vehicle_id

    const response = await request(app)
      .get("/vehicles/" + vehicleId + "/rating")
      .send()
    expect(response.statusCode).toBe(200)
    expect(response.body.hasOwnProperty("rating")).toBe(true)
    const rating = parseFloat(response.body.rating)
    expect(rating).toBeCloseTo(3.0)
  })
})
