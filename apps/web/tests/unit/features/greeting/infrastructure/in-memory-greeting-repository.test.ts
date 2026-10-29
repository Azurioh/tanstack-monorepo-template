import { greetingRepositoryContract } from "#tests/contracts/greeting-repository.contract";
import { InMemoryGreetingRepository } from "@/features/greeting/testing";

greetingRepositoryContract("InMemoryGreetingRepository", () => new InMemoryGreetingRepository());
