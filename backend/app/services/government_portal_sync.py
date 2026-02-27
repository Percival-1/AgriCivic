"""
Government Portal Synchronization Service.
Handles automated synchronization of government scheme data from official portals.
"""

import logging
import asyncio
import hashlib
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from app.services.document_ingestion import document_ingestion_pipeline
from app.services.rag_engine import rag_engine
from app.core.logging import get_logger

logger = get_logger(__name__)


class SyncStatus(Enum):
    """Synchronization status."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class DataQualityLevel(Enum):
    """Data quality assessment levels."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INVALID = "invalid"


@dataclass
class SchemeDocument:
    """Represents a government scheme document."""

    scheme_id: str
    scheme_name: str
    content: str
    metadata: Dict[str, Any]
    source_url: Optional[str] = None
    last_updated: Optional[datetime] = None
    content_hash: Optional[str] = None

    def __post_init__(self):
        """Calculate content hash after initialization."""
        if self.content_hash is None:
            self.content_hash = self._calculate_hash()

    def _calculate_hash(self) -> str:
        """Calculate SHA-256 hash of content."""
        return hashlib.sha256(self.content.encode("utf-8")).hexdigest()


@dataclass
class ValidationResult:
    """Result of data validation."""

    is_valid: bool
    quality_level: DataQualityLevel
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SyncResult:
    """Result of synchronization operation."""

    status: SyncStatus
    total_documents: int
    new_documents: int
    updated_documents: int
    failed_documents: int
    skipped_documents: int
    sync_duration_seconds: float
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)


class GovernmentPortalSync:
    """Service for synchronizing government scheme data from official portals."""

    def __init__(self):
        """Initialize the government portal sync service."""
        self.rag_engine = rag_engine
        self.document_pipeline = document_ingestion_pipeline

        # Track synchronized documents
        self.synced_documents: Dict[str, SchemeDocument] = {}
        self.last_sync_time: Optional[datetime] = None

        # Configuration
        self.sync_interval_hours = 24
        self.batch_size = 50
        self.max_retries = 3
        self.validation_enabled = True

        # Portal configurations (would be loaded from config in production)
        self.portal_configs = self._initialize_portal_configs()

    def _initialize_portal_configs(self) -> List[Dict[str, Any]]:
        """Initialize portal configurations."""
        return [
            {
                "name": "PM-KISAN Portal",
                "url": "https://pmkisan.gov.in",
                "scheme_type": "income_support",
                "enabled": True,
            },
            {
                "name": "Kisan Credit Card Portal",
                "url": "https://www.nabard.org/kcc",
                "scheme_type": "loan",
                "enabled": True,
            },
            {
                "name": "Pradhan Mantri Fasal Bima Yojana",
                "url": "https://pmfby.gov.in",
                "scheme_type": "insurance",
                "enabled": True,
            },
            {
                "name": "National Agriculture Market",
                "url": "https://www.enam.gov.in",
                "scheme_type": "marketing",
                "enabled": True,
            },
        ]

    async def sync_all_portals(
        self,
        force_sync: bool = False,
    ) -> SyncResult:
        """
        Synchronize data from all configured government portals.

        Args:
            force_sync: Force synchronization even if recently synced

        Returns:
            Aggregated synchronization results
        """
        try:
            start_time = datetime.now()
            logger.info("Starting government portal synchronization")

            # Check if sync is needed
            if not force_sync and not self._should_sync():
                logger.info("Skipping sync - recently synchronized")
                return SyncResult(
                    status=SyncStatus.COMPLETED,
                    total_documents=0,
                    new_documents=0,
                    updated_documents=0,
                    failed_documents=0,
                    skipped_documents=0,
                    sync_duration_seconds=0.0,
                    warnings=["Sync skipped - recently synchronized"],
                )

            # Sync each portal
            portal_results = []
            for portal_config in self.portal_configs:
                if not portal_config.get("enabled", True):
                    continue

                try:
                    result = await self._sync_portal(portal_config)
                    portal_results.append(result)
                except Exception as e:
                    logger.error(f"Failed to sync portal {portal_config['name']}: {e}")
                    portal_results.append(
                        SyncResult(
                            status=SyncStatus.FAILED,
                            total_documents=0,
                            new_documents=0,
                            updated_documents=0,
                            failed_documents=0,
                            skipped_documents=0,
                            sync_duration_seconds=0.0,
                            errors=[str(e)],
                        )
                    )

            # Aggregate results
            aggregated_result = self._aggregate_results(portal_results)
            aggregated_result.sync_duration_seconds = (
                datetime.now() - start_time
            ).total_seconds()

            # Update last sync time
            self.last_sync_time = datetime.now()

            logger.info(
                f"Portal synchronization completed: {aggregated_result.new_documents} new, "
                f"{aggregated_result.updated_documents} updated, "
                f"{aggregated_result.failed_documents} failed"
            )

            return aggregated_result

        except Exception as e:
            logger.error(f"Portal synchronization failed: {e}")
            return SyncResult(
                status=SyncStatus.FAILED,
                total_documents=0,
                new_documents=0,
                updated_documents=0,
                failed_documents=0,
                skipped_documents=0,
                sync_duration_seconds=(datetime.now() - start_time).total_seconds(),
                errors=[str(e)],
            )

    async def _sync_portal(
        self,
        portal_config: Dict[str, Any],
    ) -> SyncResult:
        """
        Synchronize data from a specific portal.

        Args:
            portal_config: Portal configuration

        Returns:
            Synchronization results for this portal
        """
        start_time = datetime.now()
        portal_name = portal_config["name"]

        logger.info(f"Syncing portal: {portal_name}")

        try:
            # Fetch documents from portal (simulated for now)
            documents = await self._fetch_portal_documents(portal_config)

            if not documents:
                logger.warning(f"No documents fetched from {portal_name}")
                return SyncResult(
                    status=SyncStatus.COMPLETED,
                    total_documents=0,
                    new_documents=0,
                    updated_documents=0,
                    failed_documents=0,
                    skipped_documents=0,
                    sync_duration_seconds=(datetime.now() - start_time).total_seconds(),
                    warnings=[f"No documents found in {portal_name}"],
                )

            # Process and validate documents
            processed_results = await self._process_documents(
                documents,
                portal_config,
            )

            # Calculate sync duration
            sync_duration = (datetime.now() - start_time).total_seconds()

            result = SyncResult(
                status=(
                    SyncStatus.COMPLETED
                    if processed_results["failed_documents"] == 0
                    else SyncStatus.PARTIAL
                ),
                total_documents=len(documents),
                new_documents=processed_results["new_documents"],
                updated_documents=processed_results["updated_documents"],
                failed_documents=processed_results["failed_documents"],
                skipped_documents=processed_results["skipped_documents"],
                sync_duration_seconds=sync_duration,
                errors=processed_results.get("errors", []),
                warnings=processed_results.get("warnings", []),
            )

            logger.info(f"Portal {portal_name} sync completed: {result}")
            return result

        except Exception as e:
            logger.error(f"Failed to sync portal {portal_name}: {e}")
            return SyncResult(
                status=SyncStatus.FAILED,
                total_documents=0,
                new_documents=0,
                updated_documents=0,
                failed_documents=0,
                skipped_documents=0,
                sync_duration_seconds=(datetime.now() - start_time).total_seconds(),
                errors=[str(e)],
            )

    async def _fetch_portal_documents(
        self,
        portal_config: Dict[str, Any],
    ) -> List[SchemeDocument]:
        """
        Fetch documents from a government portal.

        In production, this would make actual HTTP requests to portal APIs.
        For now, returns simulated data.

        Args:
            portal_config: Portal configuration

        Returns:
            List of scheme documents
        """
        # Simulate fetching documents from portal
        # In production, this would use requests/httpx to fetch from actual APIs

        portal_name = portal_config["name"]
        scheme_type = portal_config.get("scheme_type", "general")

        # Simulated documents based on portal type
        simulated_docs = []

        if "PM-KISAN" in portal_name:
            simulated_docs.append(
                SchemeDocument(
                    scheme_id="pmkisan_2024",
                    scheme_name="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
                    content="""PM-KISAN is a Central Sector Scheme providing income support to all landholding farmers' families.
                    
                    Benefits: Rs. 6000 per year in three equal installments of Rs. 2000 each.
                    
                    Eligibility: All landholding farmers' families with cultivable land.
                    
                    Exclusions: Institutional landholders, farmers holding constitutional posts, serving/retired government employees with pension above Rs. 10,000/month.
                    
                    Application: Online through PM-KISAN portal or through Common Service Centers (CSCs).
                    
                    Required Documents: Aadhaar card, Bank account details, Land ownership documents.
                    
                    Contact: PM-KISAN Helpline: 155261 / 011-24300606""",
                    metadata={
                        "source": portal_name,
                        "scheme_type": scheme_type,
                        "ministry": "Ministry of Agriculture & Farmers Welfare",
                        "launch_year": "2019",
                        "coverage": "nationwide",
                        "beneficiaries": "all_landholding_farmers",
                    },
                    source_url=portal_config["url"],
                    last_updated=datetime.now(),
                )
            )

        elif "Kisan Credit Card" in portal_name:
            simulated_docs.append(
                SchemeDocument(
                    scheme_id="kcc_2024",
                    scheme_name="Kisan Credit Card (KCC)",
                    content="""Kisan Credit Card scheme provides adequate and timely credit support to farmers for agriculture and allied activities.
                    
                    Benefits: Credit facility for crop cultivation, post-harvest expenses, produce marketing loan, consumption requirements, working capital for maintenance of farm assets.
                    
                    Loan Limit: Based on cropping pattern and scale of finance. Up to Rs. 3 lakh at 7% interest rate.
                    
                    Eligibility: All farmers including tenant farmers, oral lessees, and sharecroppers.
                    
                    Application: Through banks (Commercial Banks, RRBs, Cooperative Banks).
                    
                    Required Documents: Land ownership proof, Aadhaar card, PAN card, Passport size photographs.
                    
                    Interest Subvention: 2% interest subvention and additional 3% for prompt repayment.""",
                    metadata={
                        "source": portal_name,
                        "scheme_type": scheme_type,
                        "ministry": "Ministry of Agriculture & Farmers Welfare",
                        "implementing_agency": "NABARD",
                        "coverage": "nationwide",
                        "loan_type": "short_term_credit",
                    },
                    source_url=portal_config["url"],
                    last_updated=datetime.now(),
                )
            )

        elif "Fasal Bima" in portal_name:
            simulated_docs.append(
                SchemeDocument(
                    scheme_id="pmfby_2024",
                    scheme_name="Pradhan Mantri Fasal Bima Yojana (PMFBY)",
                    content="""PMFBY provides comprehensive insurance coverage against crop loss.
                    
                    Coverage: All food & oilseed crops and annual commercial/horticultural crops.
                    
                    Premium: Kharif crops - 2%, Rabi crops - 1.5%, Commercial/Horticultural crops - 5% of sum insured.
                    
                    Risks Covered: Prevented sowing, standing crop losses, post-harvest losses, localized calamities.
                    
                    Eligibility: All farmers including sharecroppers and tenant farmers.
                    
                    Application: Through banks, CSCs, insurance companies, or online portal.
                    
                    Required Documents: Land records, Aadhaar card, Bank account details, Sowing certificate.
                    
                    Claim Settlement: Within 2 months of crop loss assessment.""",
                    metadata={
                        "source": portal_name,
                        "scheme_type": scheme_type,
                        "ministry": "Ministry of Agriculture & Farmers Welfare",
                        "launch_year": "2016",
                        "coverage": "nationwide",
                        "insurance_type": "crop_insurance",
                    },
                    source_url=portal_config["url"],
                    last_updated=datetime.now(),
                )
            )

        elif "eNAM" in portal_name or "National Agriculture Market" in portal_name:
            simulated_docs.append(
                SchemeDocument(
                    scheme_id="enam_2024",
                    scheme_name="National Agriculture Market (e-NAM)",
                    content="""e-NAM is a pan-India electronic trading portal for agricultural commodities.
                    
                    Benefits: Transparent price discovery, online payment, quality assurance, reduced transaction costs.
                    
                    Coverage: 1000+ mandis across India integrated on single platform.
                    
                    Commodities: All major agricultural commodities including cereals, pulses, oilseeds, fruits, vegetables.
                    
                    Registration: Free registration for farmers, traders, and commission agents.
                    
                    Process: Upload produce details, quality testing, online bidding, payment through banks.
                    
                    Required Documents: Aadhaar card, Bank account details, Mobile number.
                    
                    Support: Training and capacity building for farmers and market functionaries.""",
                    metadata={
                        "source": portal_name,
                        "scheme_type": scheme_type,
                        "ministry": "Ministry of Agriculture & Farmers Welfare",
                        "launch_year": "2016",
                        "coverage": "nationwide",
                        "platform_type": "digital_marketplace",
                    },
                    source_url=portal_config["url"],
                    last_updated=datetime.now(),
                )
            )

        logger.info(f"Fetched {len(simulated_docs)} documents from {portal_name}")
        return simulated_docs

    async def _process_documents(
        self,
        documents: List[SchemeDocument],
        portal_config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Process and ingest documents with validation.

        Args:
            documents: List of scheme documents
            portal_config: Portal configuration

        Returns:
            Processing results
        """
        new_count = 0
        updated_count = 0
        failed_count = 0
        skipped_count = 0
        errors = []
        warnings = []

        documents_to_ingest = []

        for doc in documents:
            try:
                # Validate document
                validation_result = self._validate_document(doc)

                if not validation_result.is_valid:
                    logger.warning(
                        f"Document validation failed for {doc.scheme_id}: "
                        f"{validation_result.issues}"
                    )
                    failed_count += 1
                    errors.extend(validation_result.issues)
                    continue

                if validation_result.quality_level == DataQualityLevel.LOW:
                    logger.warning(
                        f"Low quality document {doc.scheme_id}: "
                        f"{validation_result.warnings}"
                    )
                    warnings.extend(validation_result.warnings)

                # Check if document is new or updated
                existing_doc = self.synced_documents.get(doc.scheme_id)

                if existing_doc is None:
                    # New document
                    new_count += 1
                    self.synced_documents[doc.scheme_id] = doc
                    documents_to_ingest.append(doc)
                elif existing_doc.content_hash != doc.content_hash:
                    # Updated document
                    updated_count += 1
                    self.synced_documents[doc.scheme_id] = doc
                    documents_to_ingest.append(doc)
                else:
                    # No changes
                    skipped_count += 1
                    logger.debug(f"Skipping unchanged document: {doc.scheme_id}")

            except Exception as e:
                logger.error(f"Failed to process document {doc.scheme_id}: {e}")
                failed_count += 1
                errors.append(f"Processing error for {doc.scheme_id}: {str(e)}")

        # Ingest documents into RAG engine
        if documents_to_ingest:
            try:
                await self._ingest_documents(documents_to_ingest)
            except Exception as e:
                logger.error(f"Failed to ingest documents: {e}")
                errors.append(f"Ingestion error: {str(e)}")
                failed_count += len(documents_to_ingest)
                new_count = 0
                updated_count = 0

        return {
            "new_documents": new_count,
            "updated_documents": updated_count,
            "failed_documents": failed_count,
            "skipped_documents": skipped_count,
            "errors": errors,
            "warnings": warnings,
        }

    def _validate_document(self, document: SchemeDocument) -> ValidationResult:
        """
        Validate document quality and completeness.

        Args:
            document: Scheme document to validate

        Returns:
            Validation result
        """
        issues = []
        warnings = []
        quality_score = 100

        # Check required fields
        if not document.scheme_id:
            issues.append("Missing scheme_id")
            quality_score -= 30

        if not document.scheme_name:
            issues.append("Missing scheme_name")
            quality_score -= 30

        if not document.content or len(document.content.strip()) < 50:
            issues.append("Content too short or missing")
            quality_score -= 40

        # Check content quality
        content_lower = document.content.lower()

        # Check for key information
        key_terms = ["eligibility", "benefit", "application", "document"]
        missing_terms = [term for term in key_terms if term not in content_lower]

        if len(missing_terms) > 2:
            warnings.append(f"Missing key information: {', '.join(missing_terms)}")
            quality_score -= 10 * len(missing_terms)

        # Check metadata completeness
        if not document.metadata:
            warnings.append("No metadata provided")
            quality_score -= 10
        else:
            required_metadata = ["source", "scheme_type"]
            missing_metadata = [
                field for field in required_metadata if field not in document.metadata
            ]
            if missing_metadata:
                warnings.append(f"Missing metadata: {', '.join(missing_metadata)}")
                quality_score -= 5 * len(missing_metadata)

        # Determine quality level
        if quality_score >= 80:
            quality_level = DataQualityLevel.HIGH
        elif quality_score >= 60:
            quality_level = DataQualityLevel.MEDIUM
        elif quality_score >= 40:
            quality_level = DataQualityLevel.LOW
        else:
            quality_level = DataQualityLevel.INVALID

        is_valid = len(issues) == 0 and quality_level != DataQualityLevel.INVALID

        return ValidationResult(
            is_valid=is_valid,
            quality_level=quality_level,
            issues=issues,
            warnings=warnings,
            metadata={"quality_score": quality_score},
        )

    async def _ingest_documents(
        self,
        documents: List[SchemeDocument],
    ) -> None:
        """
        Ingest documents into RAG engine.

        Args:
            documents: List of documents to ingest
        """
        # Convert SchemeDocument to RAG engine format
        rag_documents = []

        for doc in documents:
            rag_doc = {
                "content": doc.content,
                "metadata": {
                    **doc.metadata,
                    "scheme_id": doc.scheme_id,
                    "scheme_name": doc.scheme_name,
                    "source_url": doc.source_url,
                    "last_updated": (
                        doc.last_updated.isoformat() if doc.last_updated else None
                    ),
                    "content_hash": doc.content_hash,
                    "sync_timestamp": datetime.now().isoformat(),
                },
            }
            rag_documents.append(rag_doc)

        # Ingest into government_schemes collection
        result = self.rag_engine.ingest_document_batch(
            documents=rag_documents,
            collection_name="government_schemes",
            batch_size=self.batch_size,
        )

        logger.info(
            f"Ingested {result.get('processed_documents', 0)} documents "
            f"into government_schemes collection"
        )

    def _should_sync(self) -> bool:
        """Check if synchronization should be performed."""
        if self.last_sync_time is None:
            return True

        time_since_sync = datetime.now() - self.last_sync_time
        return time_since_sync >= timedelta(hours=self.sync_interval_hours)

    def _aggregate_results(
        self,
        results: List[SyncResult],
    ) -> SyncResult:
        """Aggregate multiple sync results."""
        if not results:
            return SyncResult(
                status=SyncStatus.COMPLETED,
                total_documents=0,
                new_documents=0,
                updated_documents=0,
                failed_documents=0,
                skipped_documents=0,
                sync_duration_seconds=0.0,
            )

        total_docs = sum(r.total_documents for r in results)
        new_docs = sum(r.new_documents for r in results)
        updated_docs = sum(r.updated_documents for r in results)
        failed_docs = sum(r.failed_documents for r in results)
        skipped_docs = sum(r.skipped_documents for r in results)

        all_errors = []
        all_warnings = []
        for r in results:
            all_errors.extend(r.errors)
            all_warnings.extend(r.warnings)

        # Determine overall status
        if all(r.status == SyncStatus.COMPLETED for r in results):
            status = SyncStatus.COMPLETED
        elif all(r.status == SyncStatus.FAILED for r in results):
            status = SyncStatus.FAILED
        else:
            status = SyncStatus.PARTIAL

        return SyncResult(
            status=status,
            total_documents=total_docs,
            new_documents=new_docs,
            updated_documents=updated_docs,
            failed_documents=failed_docs,
            skipped_documents=skipped_docs,
            sync_duration_seconds=0.0,  # Will be set by caller
            errors=all_errors,
            warnings=all_warnings,
        )

    async def schedule_automated_sync(
        self,
        interval_hours: int = 24,
    ) -> None:
        """
        Schedule automated synchronization at regular intervals.

        Args:
            interval_hours: Sync interval in hours
        """
        self.sync_interval_hours = interval_hours

        logger.info(f"Scheduled automated sync every {interval_hours} hours")

        while True:
            try:
                await asyncio.sleep(interval_hours * 3600)
                logger.info("Starting scheduled portal synchronization")
                result = await self.sync_all_portals()
                logger.info(f"Scheduled sync completed: {result.status}")
            except Exception as e:
                logger.error(f"Scheduled sync failed: {e}")

    def get_sync_status(self) -> Dict[str, Any]:
        """Get current synchronization status."""
        return {
            "last_sync_time": (
                self.last_sync_time.isoformat() if self.last_sync_time else None
            ),
            "total_synced_documents": len(self.synced_documents),
            "sync_interval_hours": self.sync_interval_hours,
            "next_sync_due": (
                (
                    self.last_sync_time + timedelta(hours=self.sync_interval_hours)
                ).isoformat()
                if self.last_sync_time
                else "immediately"
            ),
            "configured_portals": len(self.portal_configs),
            "enabled_portals": sum(
                1 for p in self.portal_configs if p.get("enabled", True)
            ),
        }


# Global instance
government_portal_sync = GovernmentPortalSync()
