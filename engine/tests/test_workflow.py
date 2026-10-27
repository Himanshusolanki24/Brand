"""End-to-end workflow: analyze → evidence verdicts → resolve → sign → ratify."""

import httpx


async def test_full_review_flow(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    # 1. Creator submits a draft with anchorable + unanchorable claims.
    resp = await client.post(
        "/reviews/analyze",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
        json={
            "title": "Flow probe",
            "channel": "Email",
            "sections": [
                {"heading": "Hook", "body": "Cold brew with 40% less acid, best in America."},
                {"heading": "Proof", "body": "USDA Organic certified and carbon neutral."},
            ],
        },
    )
    assert resp.status_code == 201
    review = resp.json()
    rid = review["id"]
    blocking = [i for i in review["issues"] if i["severity"] in ("high", "medium")]

    # 2. Resolve every blocking finding.
    for issue in blocking:
        r = await client.post(
            f"/reviews/{rid}/issues/{issue['id']}/resolve",
            headers={"Authorization": f"Bearer {tokens['creator']}"},
            json={"status": "edited", "replacement": "A cold brew we can prove."},
        )
        assert r.status_code == 200
        updated = r.json()
        updated_issue = next(i for i in updated["issues"] if i["id"] == issue["id"])
        assert updated_issue["status"] == "edited"

    # 3. Send for approval.
    r = await client.post(
        f"/reviews/{rid}/send-for-approval",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "ready_for_approval"

    # 4. Approver signs the lane.
    ws = (await client.get(
        "/workspace", headers={"Authorization": f"Bearer {tokens['approver']}"}
    )).json()
    lane = next(a for a in ws["approvals"] if a["reviewId"] == rid)
    r = await client.post(
        f"/approvals/{lane['id']}/sign",
        headers={"Authorization": f"Bearer {tokens['approver']}"},
        json={"note": ""},
    )
    assert r.status_code == 200
    assert r.json()["state"] == "signed"

    # 5. Manifest exists with a sha.
    mf = await client.get(
        f"/approvals/{lane['id']}/manifest.pdf",
        headers={"Authorization": f"Bearer {tokens['reviewer']}"},
    )
    assert mf.status_code == 200
    assert mf.content[:4] == b"%PDF"


async def test_return_requires_note(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    resp = await client.post(
        "/reviews/analyze",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
        json={
            "title": "Return probe", "channel": "Email",
            "sections": [{"heading": "h", "body": "clean copy, no claims"}],
        },
    )
    rid = resp.json()["id"]
    await client.post(
        f"/reviews/{rid}/send-for-approval",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
    )
    ws = (await client.get(
        "/workspace", headers={"Authorization": f"Bearer {tokens['approver']}"}
    )).json()
    lane = next(a for a in ws["approvals"] if a["reviewId"] == rid)
    r = await client.post(
        f"/approvals/{lane['id']}/return",
        headers={"Authorization": f"Bearer {tokens['approver']}"},
        json={"note": "   "},
    )
    assert r.status_code == 422
    r_ok = await client.post(
        f"/approvals/{lane['id']}/return",
        headers={"Authorization": f"Bearer {tokens['approver']}"},
        json={"note": "Tighten the offer copy."},
    )
    assert r_ok.status_code == 200
    assert r_ok.json()["state"] == "returned"


async def test_ratify_bumps_version_and_clause(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    before = (await client.get(
        "/workspace", headers={"Authorization": f"Bearer {tokens['reviewer']}"}
    )).json()
    resp = await client.post(
        "/proposals/amp2/ratify",
        headers={"Authorization": f"Bearer {tokens['approver']}"},
    )
    assert resp.status_code == 200
    after = (await client.get(
        "/workspace", headers={"Authorization": f"Bearer {tokens['reviewer']}"}
    )).json()
    assert after["guidelineVersion"] != before["guidelineVersion"]
    assert after["guidelineVersion"].endswith("draft")
    clause_21 = next(g for g in after["guidelines"] if g["number"] == "2.1")
    assert "may cite either a fact sheet entry" in clause_21["text"]
