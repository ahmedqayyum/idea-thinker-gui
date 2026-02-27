"""Serves examples, domains, schema from the project root."""

from fastapi import APIRouter
from app import get_defaults

router = APIRouter()


@router.get("/examples")
async def get_examples():
    return get_defaults().get_examples()


@router.get("/domains")
async def get_domains():
    return get_defaults().get_domains()


@router.get("/schema")
async def get_schema():
    return get_defaults().get_schema()


@router.get("/providers")
async def get_providers():
    return get_defaults().get_available_providers()
